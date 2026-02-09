
import React, { useState, useEffect, useRef } from 'react';
import { PodcastData, PodcastSegment, Citation, Language } from '../types';
import { generatePodcastAudio } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';
import { Play, Pause, SkipBack, SkipForward, Headphones, Clock, BookOpen, Sparkles, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

interface Props {
  podcastEn: PodcastData | null;
  podcastPt: PodcastData | null;
  onCitationClick: (citation: Citation) => void;
  onAudioUpdate: (segmentId: string, audioUrl: string, language: Language) => void;
  language: Language; 
}

// Helper to convert raw PCM (24kHz, 16bit, 1ch) to WAV Blob for browser playback
const pcmToWav = (base64PCM: string, sampleRate = 24000) => {
   const binaryString = window.atob(base64PCM);
   const len = binaryString.length;
   const buffer = new ArrayBuffer(44 + len);
   const view = new DataView(buffer);
   
   const writeString = (view: DataView, offset: number, string: string) => {
     for (let i = 0; i < string.length; i++) {
       view.setUint8(offset + i, string.charCodeAt(i));
     }
   };

   writeString(view, 0, 'RIFF');
   view.setUint32(4, 36 + len, true);
   writeString(view, 8, 'WAVE');
   writeString(view, 12, 'fmt ');
   view.setUint32(16, 16, true);
   view.setUint16(20, 1, true);
   view.setUint16(22, 1, true);
   view.setUint32(24, sampleRate, true);
   view.setUint32(28, sampleRate * 2, true);
   view.setUint16(32, 2, true);
   view.setUint16(34, 16, true);
   writeString(view, 36, 'data');
   view.setUint32(40, len, true);
   
   const pcmBytes = new Uint8Array(buffer, 44);
   for (let i = 0; i < len; i++) {
     pcmBytes[i] = binaryString.charCodeAt(i);
   }
   
   return new Blob([buffer], { type: 'audio/wav' });
};

const PodcastView: React.FC<Props> = ({ podcastEn, podcastPt, onCitationClick, onAudioUpdate, language }) => {
  const [audioLang, setAudioLang] = useState<Language>(language);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  
  // Audio generation queue state
  const [isGenerating, setIsGenerating] = useState(false);
  const [segmentErrors, setSegmentErrors] = useState<Record<string, string>>({});
  const queueActiveRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const t = TRANSLATIONS[language];
  const currentPodcast = audioLang === 'en' ? podcastEn : podcastPt;
  const duration = currentPodcast?.estimatedDurationSeconds || 0;
  const segments = currentPodcast?.segments || [];
  const allSegmentsReady = segments.length > 0 && segments.every(s => !!s.audioUrl);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSegmentId(segments.length > 0 ? segments[0].id : null);
  }, [audioLang]);

  useEffect(() => {
    if (!currentPodcast || !segments.length) return;
    const currentSeg = segments.find(s => currentTime >= s.startSeconds && currentTime < s.endSeconds);
    if (currentSeg && currentSeg.id !== activeSegmentId) setActiveSegmentId(currentSeg.id);
  }, [currentTime, currentPodcast, duration, segments]);

  // RELIABILITY FIX: Sequential processing queue for audio generation
  useEffect(() => {
    const processQueue = async () => {
        if (!currentPodcast || segments.length === 0 || queueActiveRef.current) return;
        
        const segmentsToGenerate = segments.filter(s => !s.audioUrl && !segmentErrors[s.id]);
        if (segmentsToGenerate.length === 0) {
            setIsGenerating(false);
            return;
        }

        queueActiveRef.current = true;
        setIsGenerating(true);

        const speakers = [
            { speaker: 'A', voice: 'Kore' },
            { speaker: 'B', voice: 'Puck' }
        ];

        for (const seg of segmentsToGenerate) {
            try {
                let script = "";
                seg.transcript?.forEach(turn => {
                    script += `${turn.speaker}: ${turn.text}\n`;
                });

                if (!script.trim()) continue;

                const pcmBase64 = await generatePodcastAudio(script, speakers);
                const blob = pcmToWav(pcmBase64);
                const url = URL.createObjectURL(blob);
                
                onAudioUpdate(seg.id, url, audioLang);
            } catch (err: any) {
                console.error(`Queue error at segment ${seg.id}:`, err);
                setSegmentErrors(prev => ({ ...prev, [seg.id]: err.message || "Failed" }));
                // Don't halt the whole queue, just mark this one as failed
            }
        }

        queueActiveRef.current = false;
        setIsGenerating(false);
    };

    processQueue();
  }, [currentPodcast, segments, onAudioUpdate, audioLang, segmentErrors]);

  useEffect(() => {
    if (!allSegmentsReady) return; 
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
        audio.play().catch(e => {
            if (e.name !== 'AbortError') setIsPlaying(false);
        });
    } else {
        audio.pause();
    }
  }, [isPlaying, allSegmentsReady]);

  useEffect(() => {
    if (!activeSegmentId) return;
    const segment = segments.find(s => s.id === activeSegmentId);
    if (!segment?.audioUrl) return;

    const audio = audioRef.current;
    if (audio && audio.src !== segment.audioUrl) {
        audio.src = segment.audioUrl;
        audio.playbackRate = playbackSpeed;
        const offset = Math.max(0, currentTime - segment.startSeconds);
        audio.currentTime = (offset < segment.endSeconds - segment.startSeconds) ? offset : 0;
        if (isPlaying) audio.play().catch(() => {});
    }
  }, [activeSegmentId, segments, allSegmentsReady]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (activeSegmentId) {
       const segment = segments.find(s => s.id === activeSegmentId);
       if (segment?.audioUrl && audioRef.current) {
           const offset = val - segment.startSeconds;
           if (offset >= 0 && offset < (segment.endSeconds - segment.startSeconds)) {
               audioRef.current.currentTime = offset;
           }
       }
    }
  };

  const handleRetry = (segId: string) => {
    setSegmentErrors(prev => {
        const next = { ...prev };
        delete next[segId];
        return next;
    });
  };

  if (!currentPodcast) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 space-y-4">
        <Headphones size={48} className="text-slate-300" />
        <p>{t.noPodcast} {audioLang === 'en' ? 'English' : 'Portuguese'}.</p>
      </div>
    );
  }

  const activeSegment = segments.find(s => s.id === activeSegmentId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <audio 
         ref={audioRef}
         onTimeUpdate={() => {
            if (audioRef.current && activeSegmentId) {
                const segment = segments.find(s => s.id === activeSegmentId);
                if (segment) setCurrentTime(segment.startSeconds + audioRef.current.currentTime);
            }
         }}
         onEnded={() => {
            const currentIndex = segments.findIndex(s => s.id === activeSegmentId);
            if (currentIndex !== -1 && currentIndex < segments.length - 1) {
                const next = segments[currentIndex + 1];
                setActiveSegmentId(next.id);
                setCurrentTime(next.startSeconds);
            } else {
                setIsPlaying(false);
                setCurrentTime(0);
            }
         }}
      />

      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-32 bg-indigo-600/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${allSegmentsReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-indigo-300'}`}>
                            {isGenerating ? (
                            <>
                                <Loader2 size={12} className="animate-spin" /> {t.generating}
                            </>
                            ) : allSegmentsReady ? (
                            <>
                                <Sparkles size={12} /> {t.audioReady}
                            </>
                            ) : (
                                <>
                                  <Headphones size={12} /> {t.scriptOnly}
                                </>
                            )}
                        </span>

                        <div className="flex bg-slate-800 rounded-full p-0.5 border border-slate-700">
                             <button onClick={() => setAudioLang('en')} className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${audioLang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
                             <button onClick={() => setAudioLang('pt')} className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${audioLang === 'pt' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>PT</button>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold leading-tight mb-2">{currentPodcast.title}</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {Math.ceil(duration / 60)} {t.minListen}</span>
                        <span>•</span>
                        <span>{segments.length} {t.segments}</span>
                    </div>
                </div>
                
                <button onClick={() => setPlaybackSpeed(s => s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors">
                    {playbackSpeed}x
                </button>
            </div>

            <div className="space-y-4">
                <input type="range" min={0} max={duration} value={currentTime} onChange={handleSeek} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all" />
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setCurrentTime(Math.max(0, currentTime - 10))} className="text-slate-400 hover:text-white transition-colors p-2"><SkipBack size={20} /></button>
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled={!allSegmentsReady}
                        className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ${!allSegmentsReady ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'}`}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))} className="text-slate-400 hover:text-white transition-colors p-2"><SkipForward size={20} /></button>
                </div>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">{t.segments}</h3>
        {segments.map((seg) => {
            const isActive = activeSegmentId === seg.id;
            const hasError = segmentErrors[seg.id];
            
            return (
                <div 
                    key={seg.id}
                    className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20' : 'bg-white border-slate-200'}`}
                >
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 text-center">
                            <span className={`text-xs font-mono font-medium block ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {formatTime(seg.startSeconds)}
                            </span>
                            <div className="mt-2 flex justify-center">
                                {seg.audioUrl ? (
                                    <Headphones size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                                ) : hasError ? (
                                    <button onClick={() => handleRetry(seg.id)} className="text-rose-500 hover:text-rose-700"><RefreshCw size={14} /></button>
                                ) : (
                                    <Loader2 size={14} className="animate-spin text-slate-300" />
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{seg.title}</h4>
                            <p className="text-sm text-slate-600 leading-relaxed mb-2">{seg.summary}</p>
                            {hasError && <p className="text-[10px] text-rose-500 font-bold uppercase mb-2">Error: {segmentErrors[seg.id]}</p>}
                            <div className="flex flex-wrap gap-2">
                                {seg.citations.map((cite, i) => (
                                    <button key={i} onClick={() => onCitationClick(cite)} className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">
                                        <BookOpen size={10} /> {cite.sourceId || `p.${cite.page}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default PodcastView;
