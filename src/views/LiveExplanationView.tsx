
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, VolumeX, AlertCircle, Loader2, Headphones, PlayCircle } from 'lucide-react';
import { LiveContextPack, ExplanationDepth, Language } from '../types';
import { connectLive, createPcmBlob, decode, decodeAudioData } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contextPack: LiveContextPack;
  language: Language;
}

const LiveExplanationView: React.FC<Props> = ({ isOpen, onClose, contextPack, language }) => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'live'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [depth, setDepth] = useState<ExplanationDepth>('Intermediate');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  const t = TRANSLATIONS[language];

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    activeSourcesRef.current.forEach(s => s.stop());
    activeSourcesRef.current.clear();

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    setStatus('disconnected');
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    try {
      setError(null);
      setStatus('connecting');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outNode = outCtx.createGain();
      outNode.connect(outCtx.destination);

      inputAudioContextRef.current = inCtx;
      outputAudioContextRef.current = outCtx;
      outputNodeRef.current = outNode;

      const sessionPromise = connectLive(contextPack, depth, language, {
        onopen: () => {
          setStatus('live');
          // Start streaming mic
          const source = inCtx.createMediaStreamSource(stream);
          const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inCtx.destination);
        },
        onmessage: async (message) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioBase64 && !isMuted) {
            setIsSpeaking(true);
            const buffer = await decodeAudioData(decode(audioBase64), outCtx, 24000, 1);
            const source = outCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outNode);

            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;

            activeSourcesRef.current.add(source);
            source.onended = () => {
              activeSourcesRef.current.delete(source);
              if (activeSourcesRef.current.size === 0) {
                setIsSpeaking(false);
              }
            };
          }

          if (message.serverContent?.interrupted) {
            activeSourcesRef.current.forEach(s => s.stop());
            activeSourcesRef.current.clear();
            setIsSpeaking(false);
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error("Live session error", e);
          setError("Connection lost. Please try again.");
          stopSession();
        },
        onclose: () => {
          stopSession();
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.name === 'NotAllowedError' ? "Microphone permission denied." : "Could not start live session.");
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => { stopSession(); };
  }, [isOpen, stopSession]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between text-white animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold tracking-tight">Live Explanation Mode</h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className={`w-2 h-2 rounded-full ${status === 'live' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-70">
              {status === 'live' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Focal Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 w-full max-w-lg px-6">
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-32 h-32 flex items-center justify-center">

            {/* Pulsating Ring Wrapper for Guaranteed Centering */}

            {isSpeaking && (

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                <div className="absolute w-48 h-48 bg-indigo-600/30 rounded-full animate-ping" />

                <div className="absolute w-64 h-64 bg-indigo-600/10 rounded-full animate-pulse" />

              </div>

            )}



            {/* Core Circle */}

            <div className={`
                  w-full h-full rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 z-10
                  ${status === 'live' ? 'bg-indigo-600' : 'bg-slate-800'}
                  ${isSpeaking ? 'scale-110 shadow-indigo-500/40' : 'scale-100'}
               `}>
              {status === 'live' ? (
                isSpeaking ? <Volume2 size={48} className="animate-in zoom-in duration-300" /> : <Mic size={48} />
              ) : (
                <Headphones size={48} className="opacity-40" />
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="h-6 flex items-center justify-center">
            <p className="text-sm font-medium text-white/50 animate-pulse">
              {status === 'live' ? (
                isSpeaking ? "BrainLens is speaking..." : "Listening to you..."
              ) : status === 'connecting' ? (
                "Establishing secure link..."
              ) : (
                "Ready to start?"
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="flex flex-col items-center gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Select Depth</span>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {(['Beginner', 'Intermediate', 'Advanced'] as ExplanationDepth[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${depth === d ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={startSession}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-900/40 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              <PlayCircle size={24} /> Start Live Session
            </button>
          </div>
        )}

        {status === 'live' && (
          <div className="flex items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all border ${isMuted ? 'bg-rose-600/20 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-white'}`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={stopSession}
              className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-900/40 transition-all flex items-center justify-center gap-2"
            >
              Stop Session
            </button>
          </div>
        )}
      </div>

      {/* Footer Instruction */}
      <div className="w-full max-w-lg mx-auto px-6 pb-12 text-center text-white/40">
        <p className="text-xs leading-relaxed">
          BrainLens is connected to your microphone. It uses the full context of <strong>{contextPack.title}</strong> to explain concepts in real-time. Just start talking to begin the lesson.
        </p>
      </div>
    </div>
  );
};

export default LiveExplanationView;
