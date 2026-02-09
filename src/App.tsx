
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AppState, Citation, EvidenceCard, BriefingSlide, ConsistencyCheck, PipelineStep, InsightItem, PodcastData, Language, AppContent, LiveContextPack } from './types';
import { runPipelineStep, sendChatMessage, translateJSON } from './services/geminiService';
import { getMockData, SAMPLE_PDF_URL, TRANSLATIONS } from './constants';
import BriefingView from './views/BriefingView';
import EvidenceCardsView from './views/EvidenceCardsView';
import ConsistencyView from './views/ConsistencyView';
import AskView from './views/AskView';
import InsightsView from './views/InsightsView';
import PodcastView from './views/PodcastView';
import LiveExplanationView from './views/LiveExplanationView';
import AhaModeOverlay from './components/AhaModeOverlay';
import PdfThumbnail from './components/PdfThumbnail';
import { runPipeline, PipelineStage, Runner } from './pipeline/runPipeline';
import { FileText, Layout, CheckSquare, MessageSquare, UploadCloud, PlayCircle, Brain, Search, AlertCircle, Sparkles, Headphones, Globe, Loader2, X, Zap, Maximize2 } from 'lucide-react';

const SAMPLE_FILE_NAME = 'Momentum_Deep_Learning.pdf';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    language: 'en',
    step: 'idle',
    pdfBase64: null,
    fileName: null,
    briefing: [],
    evidenceCards: [],
    consistencyReport: [],
    insights: [],
    podcast: { en: null, pt: null },
    contentCache: {},
    isTranslating: false,
    chatHistory: [],
    selectedCitation: null,
    error: null,
    isLiveModeActive: false,
  });

  const [activeTab, setActiveTab] = useState<'briefing' | 'consistency' | 'evidence' | 'insights' | 'podcast'>('briefing');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSourceFullScreen, setIsSourceFullScreen] = useState(false);

  // A-HA MODE State
  const [selectedInsightForAha, setSelectedInsightForAha] = useState<InsightItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pipelineAbortControllerRef = useRef<AbortController | null>(null);

  const t = TRANSLATIONS[state.language];

  const getStepNumber = (step: PipelineStep): number => {
    const stepMap: Record<string, number> = {
      'ingest': 1, 'compose': 2, 'claims': 3, 'check': 4, 'figures': 5, 'insights': 6, 'podcast': 7
    };
    return stepMap[step] || 0;
  };

  const handleGoHome = useCallback(() => {
    if (pipelineAbortControllerRef.current) {
      pipelineAbortControllerRef.current.abort();
      pipelineAbortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev, step: 'idle', pdfBase64: null, fileName: null, briefing: [], evidenceCards: [],
      consistencyReport: [], insights: [], podcast: { en: null, pt: null }, error: null,
      selectedCitation: null, chatHistory: [], isLiveModeActive: false
    }));
    setIsChatOpen(false);
    setActiveTab('briefing');
  }, []);

  const handleLanguageToggle = () => {
    const newLang = state.language === 'en' ? 'pt' : 'en';
    setState(prev => {
      if (prev.fileName === SAMPLE_FILE_NAME) {
        const newData = loadSampleDataForLanguage(newLang);
        return { ...prev, language: newLang, ...newData };
      }
      const cached = prev.contentCache[newLang];
      if (cached) {
        return { ...prev, language: newLang, briefing: cached.briefing, evidenceCards: cached.evidenceCards, consistencyReport: cached.consistencyReport, insights: cached.insights };
      }
      return { ...prev, language: newLang };
    });
  };

  const loadSampleDataForLanguage = (lang: Language) => {
    const mockData = getMockData(lang);
    return {
      briefing: mockData.briefing as BriefingSlide[],
      evidenceCards: mockData.evidenceCards as EvidenceCard[],
      consistencyReport: mockData.consistencyReport as ConsistencyCheck[],
      insights: mockData.insights as InsightItem[],
      podcast: { en: mockData.podcast.en as PodcastData, pt: mockData.podcast.pt as PodcastData },
    };
  };

  const startPipeline = async (pdfBase64: string) => {
    pipelineAbortControllerRef.current = new AbortController();
    const signal = pipelineAbortControllerRef.current.signal;
    try {
      setState(prev => ({ ...prev, error: null }));
      const currentLang = state.language;
      setState(prev => ({ ...prev, step: 'ingest' }));

      const runners: Partial<Record<PipelineStage, Runner>> = {
        briefing: async ({ signal }) => {
          setState(prev => ({ ...prev, step: 'ingest' }));
          const ingestData = await runPipelineStep('ingest', pdfBase64, undefined, currentLang, signal);
          setState(prev => ({ ...prev, step: 'compose' }));
          const composeData = await runPipelineStep('compose', pdfBase64, { ingest: ingestData }, currentLang, signal);
          return { ingestData, composeData };
        },
        consistency: async ({ prev, signal }) => {
          const { ingestData } = prev.briefing;
          setState(prev => ({ ...prev, step: 'claims' }));
          const claimsData = await runPipelineStep('claims', pdfBase64, { ingest: ingestData }, currentLang, signal);
          setState(prev => ({ ...prev, step: 'check' }));
          const checkData = await runPipelineStep('check', pdfBase64, { claims: claimsData.claims, extraContext: { ingest: ingestData } }, currentLang, signal);
          return { claimsData, checkData };
        },
        evidence: async ({ prev, signal }) => {
          const { ingestData } = prev.briefing;
          setState(prev => ({ ...prev, step: 'figures' }));
          const figuresData = await runPipelineStep('figures', pdfBase64, { ingest: ingestData }, currentLang, signal);
          return { figuresData };
        },
        insights: async ({ prev, signal }) => {
          const { ingestData } = prev.briefing;
          const { claimsData } = prev.consistency;
          const { figuresData } = prev.evidence;
          setState(prev => ({ ...prev, step: 'insights' }));
          const insightsData = await runPipelineStep(
            'insights',
            pdfBase64,
            { outline: ingestData.outline, topClaims: claimsData.claims, evidence: (figuresData.items || []) },
            currentLang,
            signal
          );
          return { insightsData };
        },
        podcast: async ({ prev, signal }) => {
          const { ingestData } = prev.briefing;
          const { claimsData } = prev.consistency;
          setState(prev => ({ ...prev, step: 'podcast' }));
          const podcastContext = { outline: ingestData.outline, claims: claimsData.claims };

          // Run podcast generations in parallel but update state as each one completes
          const podcastEnPromise = runPipelineStep('podcast', pdfBase64, podcastContext, 'en', signal).then(data => {
            setState(prev => ({ ...prev, podcast: { ...prev.podcast, en: data } }));
            return data;
          });
          const podcastPtPromise = runPipelineStep('podcast', pdfBase64, podcastContext, 'pt', signal).then(data => {
            setState(prev => ({ ...prev, podcast: { ...prev.podcast, pt: data } }));
            return data;
          });

          await Promise.all([podcastEnPromise, podcastPtPromise]);
          return { ok: true };
        }
      };

      await runPipeline({
        ctx: { pdfBase64, language: currentLang, signal },
        runners,
        order: ["briefing", "consistency", "evidence", "insights", "podcast"],
        onStepResult: (step, result) => {
          if (step === 'briefing') {
            setState(prev => ({ ...prev, briefing: result.composeData.slides || [] }));
          } else if (step === 'consistency') {
            setState(prev => ({ ...prev, consistencyReport: result.checkData.checks || [] }));
          } else if (step === 'evidence') {
            setState(prev => ({ ...prev, evidenceCards: result.figuresData.items || [] }));
          } else if (step === 'insights') {
            setState(prev => ({ ...prev, insights: result.insightsData.items || [] }));
          }
        },
        signal
      });

      setState(prev => ({
        ...prev,
        step: "complete",
        contentCache: {
          ...prev.contentCache,
          [currentLang]: {
            briefing: prev.briefing,
            evidenceCards: prev.evidenceCards,
            consistencyReport: prev.consistencyReport,
            insights: prev.insights
          }
        }
      }));
    } catch (err: any) {
      if (err.message === 'Aborted') return;
      setState(prev => ({ ...prev, step: 'idle', error: "Failed to process PDF. Check API Key." }));
    } finally {
      pipelineAbortControllerRef.current = null;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setState(prev => ({
        ...prev, pdfBase64: base64, fileName: file.name, step: 'idle', briefing: [], evidenceCards: [], consistencyReport: [], insights: [], podcast: { en: null, pt: null }, contentCache: {}, isTranslating: false, chatHistory: [], error: null
      }));
      startPipeline(base64);
    };
    reader.readAsDataURL(file);
  };

  const loadSample = async () => {
    setState(prev => ({ ...prev, step: 'idle', fileName: SAMPLE_FILE_NAME, error: null, contentCache: {}, isTranslating: false }));
    const currentLang = state.language;
    const mockData = loadSampleDataForLanguage(currentLang);
    setState(prev => ({ ...prev, step: 'complete', ...mockData }));
    try {
      const response = await fetch(SAMPLE_PDF_URL);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setState(prev => ({ ...prev, pdfBase64: base64 }));
      };
      reader.readAsDataURL(blob);
    } catch (e) { }
  };

  const handleChatMessage = async (msg: string) => {
    if (!state.pdfBase64) {
      setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, { role: 'user', content: msg }, { role: 'model', content: "Sample view: answering is disabled for demo PDF." }] }));
      return;
    }
    setIsChatLoading(true);
    const newHistory = [...state.chatHistory, { role: 'user', content: msg } as const];
    setState(prev => ({ ...prev, chatHistory: newHistory }));
    try {
      const responseText = await sendChatMessage(state.pdfBase64, newHistory, msg);
      setState(prev => ({ ...prev, chatHistory: [...newHistory, { role: 'model', content: responseText }] }));
    } catch (e) {
      setState(prev => ({ ...prev, chatHistory: [...newHistory, { role: 'model', content: "Error connecting to Gemini." }] }));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setState(prev => ({ ...prev, selectedCitation: citation }));
    if (window.innerWidth < 1024) {
      document.getElementById('source-viewer')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePodcastAudioUpdate = useCallback((segmentId: string, url: string, lang: Language) => {
    setState(prev => {
      const podcastData = prev.podcast[lang];
      if (!podcastData) return prev;

      const updatedSegments = podcastData.segments.map(s =>
        s.id === segmentId ? { ...s, audioUrl: url } : s
      );

      return {
        ...prev,
        podcast: {
          ...prev.podcast,
          [lang]: { ...podcastData, segments: updatedSegments }
        }
      };
    });
  }, []);

  const isTabReady = (id: string): boolean => {
    if (state.step === 'complete') return true;
    switch (id) {
      case 'briefing': return (state.briefing || []).length > 0;
      case 'consistency': return (state.consistencyReport || []).length > 0;
      case 'evidence': return (state.evidenceCards || []).length > 0;
      case 'insights': return (state.insights || []).length > 0;
      case 'podcast': return state.podcast.en !== null || state.podcast.pt !== null;
      default: return false;
    }
  };

  const liveContextPack = useMemo<LiveContextPack>(() => ({
    title: state.fileName,
    summary: (state.briefing || []).map(s => s.title).join(' | '),
    outline: (state.briefing || []).flatMap(s => (s.points || []).map(p => p.text)),
    topClaims: (state.consistencyReport || []).map(c => ({ text: c.claim, page: c.citation?.page })),
    evidence: (state.evidenceCards || []).map(e => ({ id: e.id, type: e.type, caption: e.caption, page: e.page })),
    consistency: (state.consistencyReport || []).map(c => ({ claim: c.claim, status: c.status })),
    insights: (state.insights || []).map(i => ({ title: i.title, insight: i.insight }))
  }), [state.fileName, state.briefing, state.consistencyReport, state.evidenceCards, state.insights]);

  const tabs = [
    { id: 'briefing', label: t.briefing, icon: FileText },
    { id: 'consistency', label: t.consistency, icon: CheckSquare },
    { id: 'evidence', label: t.evidence, icon: Layout },
    { id: 'insights', label: t.insights, icon: Sparkles },
    { id: 'podcast', label: t.podcast, icon: Headphones }
  ] as const;

  const isLiveButtonActive = state.step !== 'idle' && state.step !== 'ingest';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 transition-colors duration-300">
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm px-4 md:px-8">
        <div className="max-w-7xl mx-auto h-16 md:h-20 flex items-center justify-between gap-4">
          <div onClick={handleGoHome} className="flex items-center gap-3 cursor-pointer group">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100 transition-transform group-hover:scale-110 relative">
              <Brain className="text-white" size={24} />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-indigo-50">
                <Search className="text-indigo-600" size={10} strokeWidth={3} />
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter hidden sm:block">BrainLens</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setState(prev => ({ ...prev, isLiveModeActive: true }))}
              disabled={!isLiveButtonActive}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed group border border-transparent ${isLiveButtonActive ? 'bg-indigo-600 hover:bg-indigo-700 animate-premium-pulse' : 'bg-slate-300'}`}
            >
              <Zap size={16} className={`fill-current group-hover:scale-125 transition-transform ${isLiveButtonActive ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span className="hidden md:inline">Live Explanation</span>
              <span className="md:hidden">Live</span>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block"></div>

            <div className="hidden lg:flex items-center gap-2">
              <button onClick={handleLanguageToggle} className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 uppercase">
                <Globe size={14} />{state.language}
              </button>
              <button onClick={loadSample} disabled={state.step !== 'idle' && state.step !== 'complete'} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap">
                <PlayCircle size={14} />{t.trySample}
              </button>
            </div>

            <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={state.step !== 'idle' && state.step !== 'complete'}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-md transition-all active:scale-95"
            >
              <UploadCloud size={18} />
              <span className="hidden sm:inline">{state.fileName ? t.uploadNew : t.uploadPdf}</span>
              <span className="sm:hidden">{state.fileName ? 'New' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* NAVIGATION BAR */}
      {state.fileName && state.step !== 'ingest' && (
        <nav className="bg-white border-b border-slate-200 sticky top-16 md:top-20 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 md:py-3 relative overflow-hidden">
            <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar scroll-smooth tab-fade-right">
              {tabs.map((tab) => {
                const ready = isTabReady(tab.id);
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    <tab.icon size={16} className={active ? 'text-indigo-600' : 'text-slate-400'} />
                    {tab.label}
                    {!ready && <Loader2 size={14} className="animate-spin text-slate-300 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col w-full">
        {state.error && (
          <div className="max-w-4xl mx-auto mt-6 w-full px-4">
            <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-sm"><AlertCircle size={20} />{state.error}</div>
          </div>
        )}

        {state.fileName ? (
          <div className="max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left/Main Column */}
            <div className={`flex flex-col h-full ${activeTab === 'evidence' ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
              <div className="flex-1 relative">
                {state.isTranslating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-500 gap-4 rounded-3xl">
                    <Loader2 size={40} className="animate-spin text-indigo-600" />
                    <p className="font-bold animate-pulse text-indigo-900 uppercase tracking-widest text-xs">Translating Insight...</p>
                  </div>
                )}

                {state.step === 'ingest' ? (
                  <div className="min-h-[500px] flex flex-col items-center justify-center text-slate-400 space-y-8 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                    <div className="text-center px-8">
                      <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">{t.processing}</h3>
                      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">Initializing heavy lifting. Step {getStepNumber(state.step)} of 7.</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {activeTab === 'briefing' && (isTabReady('briefing') ? <BriefingView slides={state.briefing} onCitationClick={handleCitationClick} language={state.language} /> : <TabPlaceholder label="Synthesizing Briefing..." />)}
                    {activeTab === 'consistency' && (isTabReady('consistency') ? <ConsistencyView report={state.consistencyReport} onCitationClick={handleCitationClick} language={state.language} /> : <TabPlaceholder label="Verifying Assertions..." />)}
                    {activeTab === 'evidence' && (isTabReady('evidence') ? <EvidenceCardsView cards={state.evidenceCards} onCardClick={handleCitationClick} pdfBase64={state.pdfBase64} language={state.language} /> : <TabPlaceholder label="Harvesting Figures..." />)}
                    {activeTab === 'insights' && (isTabReady('insights') ? <InsightsView items={state.insights} onCitationClick={handleCitationClick} onAhaClick={(insight) => setSelectedInsightForAha(insight)} language={state.language} /> : <TabPlaceholder label="Distilling Wisdom..." />)}
                    {activeTab === 'podcast' && (isTabReady('podcast') ? <PodcastView podcastEn={state.podcast.en} podcastPt={state.podcast.pt} onCitationClick={handleCitationClick} onAudioUpdate={handlePodcastAudioUpdate} language={state.language} /> : <TabPlaceholder label="Mixing Audio Master..." />)}
                  </div>
                )}

                {/* Global Status HUD */}
                {state.step !== 'complete' && state.step !== 'ingest' && state.step !== 'idle' && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900 text-white rounded-2xl p-4 shadow-2xl z-50 flex items-center justify-between border border-white/10 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center gap-4">
                      <Loader2 size={18} className="animate-spin text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-[0.15em]">{state.step}</span>
                    </div>
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${(getStepNumber(state.step) / 7) * 100}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column / Source Viewer */}
            {activeTab !== 'evidence' && (
              <aside id="source-viewer" className="lg:col-span-4 h-full">
                <div className="lg:sticky lg:top-32 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[500px] lg:max-h-[calc(100vh-10rem)]">
                  <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-400/20 p-1.5 rounded-lg relative">
                        <Brain size={12} className="text-indigo-400" />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                          <Search className="text-indigo-600" size={6} strokeWidth={4} />
                        </div>
                      </div>
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">{t.sourceViewer}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-medium truncate max-w-[140px] italic">{state.fileName}</span>
                  </div>
                  <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                    {state.selectedCitation ? (
                      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
                        {state.pdfBase64 && state.selectedCitation.page > 0 && (
                          <div
                            className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white aspect-[3/4.2] mb-6 group relative ring-1 ring-slate-100 cursor-pointer"
                            onClick={() => setIsSourceFullScreen(true)}
                          >
                            <PdfThumbnail pdfBase64={state.pdfBase64} pageNumber={state.selectedCitation.page} scale={1.5} className="bg-white" />
                            <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                              <div className="bg-white text-indigo-700 px-5 py-2.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                <Maximize2 size={16} />
                                {t.viewFullSize}
                              </div>
                            </div>
                            <div className="absolute bottom-4 right-4 bg-slate-900/90 text-white text-[10px] font-black px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest">P.{state.selectedCitation.page}</div>
                          </div>
                        )}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                          <div className="absolute -top-3 left-4">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200 uppercase tracking-tighter">
                              {state.selectedCitation.sourceId ? `${t.source}: ${state.selectedCitation.sourceId}` : t.reference}
                            </span>
                          </div>
                          <div className="font-serif text-slate-800 leading-relaxed text-base italic border-l-4 border-indigo-500 pl-5 py-2 mt-2">"{state.selectedCitation.text}"</div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-[0.2em]">{t.excerpt}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center space-y-6 py-12">
                        <div className="p-6 bg-white rounded-full shadow-inner ring-8 ring-slate-100"><FileText size={48} className="text-slate-200" /></div>
                        <div className="max-w-[200px]">
                          <p className="font-black text-slate-700 text-xs uppercase tracking-widest mb-2">{t.noCitation}</p>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.noCitationDesc}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xl space-y-8 animate-in zoom-in-95 duration-700">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                <div className="relative w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl ring-1 ring-slate-200">
                  <div className="relative">
                    <Brain className="text-indigo-600" size={48} />
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                      <Search className="text-indigo-600" size={16} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{t.welcomeTitle}</h2>
                <p className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto">{t.welcomeDesc}</p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={loadSample} className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-100 font-black rounded-2xl hover:border-indigo-200 hover:text-indigo-600 transition-all text-sm uppercase tracking-widest shadow-sm">
                  {t.trySample}
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 text-sm uppercase tracking-widest">
                  {t.uploadPdf}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Full Screen Source Modal */}
      {isSourceFullScreen && state.pdfBase64 && state.selectedCitation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 p-4 md:p-12"
          onClick={() => setIsSourceFullScreen(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-full flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-400 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-widest border border-indigo-100">
                  <div className="relative">
                    <Brain size={14} className="text-indigo-600" />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                      <Search className="text-indigo-600" size={6} strokeWidth={4} />
                    </div>
                  </div>
                  {state.selectedCitation.sourceId || 'Document Page'}
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Page {state.selectedCitation.page}</span>
              </div>

              <button
                onClick={() => setIsSourceFullScreen(false)}
                className="p-3 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 duration-300"
              >
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 relative overflow-auto p-4 md:p-12 flex justify-center items-start custom-scrollbar">
              <PdfThumbnail
                pdfBase64={state.pdfBase64}
                pageNumber={state.selectedCitation.page}
                scale={2.2}
                contain={false}
                className="bg-white shadow-2xl rounded-2xl"
              />
            </div>

            <div className="bg-white px-10 py-8 border-t border-slate-100 z-10 shrink-0">
              <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Context Excerpt</h5>
              <p className="text-lg text-slate-800 font-bold leading-relaxed">
                {state.selectedCitation.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat UI */}
      {state.fileName && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {isChatOpen ? (
            <div className="w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[80vh] mb-4 shadow-2xl rounded-3xl overflow-hidden border border-slate-200 bg-white flex flex-col animate-in slide-in-from-bottom-8 duration-300 ring-4 ring-black/5">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="font-black text-xs uppercase tracking-[0.2em]">{t.ask}</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AskView messages={state.chatHistory} onSendMessage={handleChatMessage} isLoading={isChatLoading} onCitationClick={handleCitationClick} language={state.language} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all group border-2 border-white/20"
            >
              <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="font-black text-xs uppercase tracking-widest">{t.ask}</span>
            </button>
          )}
        </div>
      )}

      <LiveExplanationView isOpen={state.isLiveModeActive} onClose={() => setState(prev => ({ ...prev, isLiveModeActive: false }))} contextPack={liveContextPack} language={state.language} />

      {selectedInsightForAha && state.pdfBase64 && (
        <AhaModeOverlay
          insight={selectedInsightForAha}
          pdfBase64={state.pdfBase64}
          language={state.language}
          onClose={() => setSelectedInsightForAha(null)}
        />
      )}
    </div>
  );
};

const TabPlaceholder = ({ label }: { label: string }) => (
  <div className="min-h-[400px] flex flex-col items-center justify-center space-y-6 opacity-60">
    <Loader2 size={48} className="animate-spin text-slate-300" />
    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">{label}</p>
  </div>
);

export default App;
