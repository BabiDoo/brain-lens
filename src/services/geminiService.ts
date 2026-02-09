
import { GoogleGenAI, GenerateContentResponse, Modality, LiveServerMessage, Blob } from "@google/genai";
import {
  INGEST_PROMPT,
  FIGURE_TABLE_PROMPT,
  CLAIM_PROMPT,
  EVIDENCE_CHECKER_PROMPT,
  INSIGHTS_PROMPT,
  PODCAST_PROMPT,
  COMPOSER_PROMPT,
  GEMINI_MODEL,
  AHA_MODE_PROMPT,
} from "../constants";
import { getLiveExplanationSystemInstruction } from "../prompts/liveExplanation";
import { Language, LiveContextPack, ExplanationDepth } from "../types";

let ai: GoogleGenAI | null = null;

const getApiKey = (): string | undefined => {
  const viteKey = (import.meta as any)?.env?.VITE_API_KEY as string | undefined;
  const proc = (globalThis as any)?.process?.env;
  const processKey = (proc?.API_KEY as string | undefined) ?? (proc?.VITE_API_KEY as string | undefined);
  return viteKey ?? processKey;
};

const getAI = () => {
  if (!ai) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("Missing API key. Set VITE_API_KEY (Vite) or API_KEY (AI Studio).");
      throw new Error("API Key missing");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

// ---------- Audio Utilities for Live API ----------

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// ---------- JSON parsing helpers (robust) ----------

const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "```").replace(/```/g, "").trim();

const tryExtractJsonBlock = (s: string) => {
  const t = stripCodeFences(s);
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) return t;
  const objMatch = t.match(/\{[\s\S]*\}/);
  if (objMatch?.[0]) return objMatch[0];
  const arrMatch = t.match(/\[[\s\S]*\]/);
  if (arrMatch?.[0]) return arrMatch[0];
  return t;
};

const safeJsonParse = <T = any>(raw: string): T => {
  const candidate = tryExtractJsonBlock(raw);
  try {
    return JSON.parse(candidate) as T;
  } catch (e) {
    try {
      // Common repairs: fix unescaped backslashes and remove trailing commas
      let repaired = candidate.replace(
        /(\\u[0-9a-fA-F]{4})|(\\["\\/bfnrt])|(\\)/g,
        (match, unicode, standard, invalid) => {
          if (unicode || standard) return match;
          return "\\\\";
        }
      ).replace(/,\s*([}\]])/g, '$1');

      return JSON.parse(repaired) as T;
    } catch (e2) {
      // One last attempt: if it looks like a truncation issue (more { than }), 
      // though this is rare with newer models.
      console.error("Failed to parse JSON even after repair.", {
        error: e,
        firstChars: candidate.substring(0, 100),
        lastChars: candidate.substring(candidate.length - 100)
      });
      throw e;
    }
  }
};

// ---------- Robust Retry Logic ----------

const delay = (ms: number, signal?: AbortSignal) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    });
  });
};

const callWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 5,
  initialDelay = 3000,
  signal?: AbortSignal
): Promise<T> => {
  let attempt = 0;
  while (attempt < retries) {
    if (signal?.aborted) throw new Error('Aborted');

    try {
      return await fn();
    } catch (error: any) {
      if (signal?.aborted || error?.message === 'Aborted') throw new Error('Aborted');

      const status = error?.status;
      const code = error?.code;
      const message = error?.message?.toLowerCase() || '';

      const isRateLimit = status === 429 || code === 429 || message.includes('429') || message.includes('quota');
      const isServerError = status === 500 || status === 503 || code === 500 || code === 503 ||
        status === 'UNAVAILABLE' ||
        message.includes('internal error') ||
        message.includes('overloaded') ||
        message.includes('unavailable');

      if ((isRateLimit || isServerError) && attempt < retries - 1) {
        const waitTime = initialDelay * Math.pow(2, attempt) + (Math.random() * 1000);
        console.warn(`Gemini API overloaded/unavailable (Attempt ${attempt + 1}). Retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime, signal);
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
};

// ---------- Prompt + request helpers ----------

const withContext = (prompt: string, contextData?: any) => {
  if (!contextData) return prompt;
  return `${prompt}\n\nCONTEXT_JSON:\n${JSON.stringify(contextData)}`;
};

const injectLanguage = (prompt: string, lang: Language) => {
  const langName = lang === 'pt' ? 'Portuguese (Brazil)' : 'English';
  return prompt.replace('{{LANGUAGE}}', langName);
};

const prepareRequest = (prompt: string, pdfBase64: string, usePro: boolean = true) => {
  return {
    model: usePro ? GEMINI_MODEL : 'gemini-3-flash-preview',
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: prompt },
        ],
      }
    ],
    config: {
      responseMimeType: "application/json",
    },
  };
};

export type PipelineStep = "ingest" | "figures" | "claims" | "check" | "insights" | "podcast" | "compose";

export const runPipelineStep = async (
  step: PipelineStep,
  pdfBase64: string,
  contextData?: any,
  language: Language = 'en',
  signal?: AbortSignal
) => {
  const aiClient = getAI();
  let basePrompt = "";
  let useProModel = true;

  switch (step) {
    case "ingest":
      basePrompt = INGEST_PROMPT;
      useProModel = false;
      break;
    case "figures":
      basePrompt = FIGURE_TABLE_PROMPT;
      break;
    case "claims":
      basePrompt = CLAIM_PROMPT;
      break;
    case "check": {
      const claims = Array.isArray(contextData) ? contextData : contextData?.claims ?? contextData;
      basePrompt = EVIDENCE_CHECKER_PROMPT.replace("{{CLAIMS_JSON}}", JSON.stringify(claims ?? []));
      const extraContext = Array.isArray(contextData) ? undefined : contextData?.extraContext ?? undefined;
      basePrompt = withContext(basePrompt, extraContext);
      break;
    }
    case "insights":
      basePrompt = INSIGHTS_PROMPT;
      break;
    case "podcast":
      basePrompt = PODCAST_PROMPT;
      useProModel = true; // Switched to Pro for more reliable JSON in large transcript outputs
      break;
    case "compose":
      basePrompt = COMPOSER_PROMPT;
      break;
  }

  basePrompt = injectLanguage(basePrompt, language);
  const finalPrompt = step === "check" ? basePrompt : withContext(basePrompt, contextData);

  try {
    const result = await callWithRetry<GenerateContentResponse>(() =>
      aiClient.models.generateContent(prepareRequest(finalPrompt, pdfBase64, useProModel)),
      5, 3000, signal
    );

    const text = result.text;
    if (!text) throw new Error("No text response from Gemini");
    return safeJsonParse(text);
  } catch (error: any) {
    if (error.message === 'Aborted') throw error;
    console.error(`Error in step ${step}:`, error);
    throw error;
  }
};

export const generateAhaPack = async (
  insightTitle: string,
  nextStep: string,
  pdfBase64: string,
  language: Language = 'en',
  signal?: AbortSignal
) => {
  const aiClient = getAI();
  let prompt = AHA_MODE_PROMPT
    .replace('{{TITLE}}', insightTitle)
    .replace('{{NEXT_STEP}}', nextStep);

  prompt = injectLanguage(prompt, language);

  const result = await callWithRetry<GenerateContentResponse>(() =>
    aiClient.models.generateContent(prepareRequest(prompt, pdfBase64, true)),
    3, 3000, signal
  );

  const text = result.text;
  if (!text) throw new Error("No response from Gemini");
  return safeJsonParse(text);
};

export const sendChatMessage = async (
  pdfBase64: string,
  history: any[],
  newMessage: string,
  signal?: AbortSignal
) => {
  const aiClient = getAI();
  const lastTurns = history?.slice(-4) ?? [];
  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
        { text: `You are BrainLens. Answer STRICTLY based on the attached paper.\nRecent chat:\n${JSON.stringify(lastTurns)}\nUser question:\n${newMessage}`.trim() },
      ],
    }
  ];

  const result = await callWithRetry<GenerateContentResponse>(() => aiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents,
  }), 5, 3000, signal);

  return result.text || "";
};

export const translateJSON = async (data: any, targetLang: Language, signal?: AbortSignal) => {
  const aiClient = getAI();
  const target = targetLang === 'pt' ? 'Portuguese (Brazil)' : 'English';
  const prompt = `Translate to ${target}. Preserve all keys/IDs. JSON: ${JSON.stringify(data)}`;

  const result = await callWithRetry<GenerateContentResponse>(() => aiClient.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  }), 5, 2000, signal);

  const text = result.text;
  if (!text) throw new Error("No translation response");
  return safeJsonParse(text);
};

export const generatePodcastAudio = async (
  transcript: string,
  speakers: { speaker: string; voice: string }[],
  signal?: AbortSignal
) => {
  const startTime = performance.now();
  try {
    const aiClient = getAI();
    const response = await callWithRetry<GenerateContentResponse>(() =>
      aiClient.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ role: "user", parts: [{ text: transcript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakers.map((s) => ({
                speaker: s.speaker,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } },
              })),
            },
          },
        },
      }), 5, 2000, signal
    );

    const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!audioPart?.inlineData?.data) throw new Error("No audio data returned from Gemini");

    const duration = performance.now() - startTime;
    return audioPart.inlineData.data;
  } catch (error: any) {
    console.error("❌ Audio generation error:", error);
    throw error;
  } finally {
    console.groupEnd();
  }
};

// ---------- Live Explanation Session ----------

export const connectLive = (
  contextPack: LiveContextPack,
  depth: ExplanationDepth,
  language: Language,
  callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
  }
) => {
  const aiClient = getAI();

  const systemInstruction = getLiveExplanationSystemInstruction(depth, language, JSON.stringify(contextPack));

  return aiClient.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction,
    },
  });
};
