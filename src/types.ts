
export type PipelineStep = 'idle' | 'ingest' | 'figures' | 'claims' | 'check' | 'insights' | 'podcast' | 'compose' | 'complete';

export type Language = 'en' | 'pt';

export interface Citation {
  page: number;
  text: string;
  sourceId?: string; // Figure or Table ID
}

export interface BriefingSlide {
  title: string;
  points: {
    text: string;
    citation?: Citation;
  }[];
}

export interface EvidenceCard {
  id: string; // e.g., "Fig 1"
  type: 'figure' | 'table';
  caption: string;
  description: string; // AI interpretation
  page: number;
  relevance: string;
}

export interface ConsistencyCheck {
  claim: string;
  status: 'Supported' | 'Weak' | 'Not Found';
  explanation: string;
  citation?: Citation;
  confidence: 'High' | 'Medium' | 'Low';
}

export type InsightItem = {
  id: string;
  title: string;
  kind:
    | "Alternative Lens"
    | "Hidden Assumption"
    | "Cross-Domain Link"
    | "Scope Boundary"
    | "Method Transfer"
    | "Hypothesis" | "Experiment Idea" | "Contradiction/Tension" | "Limitation → Opportunity";
  insight: string; // 2–4 sentences max, dense
  whyItMatters: string; // 1–2 sentences max
  actionableNextStep: string; // concrete action, experiment, reading angle
  confidence: "High" | "Medium" | "Low";
  grounding:
    | { status: "Grounded"; citations: { page?: number; sourceId?: string; text?: string }[] }
    | { status: "Speculative"; reason: string; suggestedWhereToCheck: string[] };
};

export interface PodcastSegment {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  summary: string;
  citations: Citation[];
  transcript?: { speaker: "A" | "B"; text: string }[];
  audioUrl?: string;
}

export interface PodcastData {
  title: string;
  estimatedDurationSeconds: number;
  segments: PodcastSegment[];
  audioUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  citations?: Citation[];
}

export interface AppContent {
  briefing: BriefingSlide[];
  evidenceCards: EvidenceCard[];
  consistencyReport: ConsistencyCheck[];
  insights: InsightItem[];
}

export interface AppState {
  language: Language;
  step: PipelineStep;
  pdfBase64: string | null;
  fileName: string | null;
  
  // Content (Displayed)
  briefing: BriefingSlide[];
  evidenceCards: EvidenceCard[];
  consistencyReport: ConsistencyCheck[];
  insights: InsightItem[];
  
  // Podcast is special (dual gen)
  podcast: {
    en: PodcastData | null;
    pt: PodcastData | null;
  };

  // Caching for translation
  contentCache: {
    en?: AppContent;
    pt?: AppContent;
  };
  isTranslating: boolean;

  chatHistory: ChatMessage[];
  selectedCitation: Citation | null;
  error: string | null;

  // Live Explanation Mode
  isLiveModeActive: boolean;
}

export type ExplanationDepth = 'Beginner' | 'Intermediate' | 'Advanced';

export interface LiveContextPack {
  title: string | null;
  summary: string | null;
  outline: string[];
  topClaims: { text: string; page?: number }[];
  evidence: { id: string; type: string; caption: string; page: number }[];
  consistency: { claim: string; status: string }[];
  insights: { title: string; insight: string }[];
}
