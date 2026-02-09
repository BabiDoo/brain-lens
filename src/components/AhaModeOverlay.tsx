
import React, { useState } from 'react';
import { X, Zap, Loader2, FlaskConical, Target, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InsightItem, Language } from '../types';
import { generateAhaPack } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';

interface HypothesisMetric {
  metric: string;
  expected_direction: 'increase' | 'decrease' | 'none';
  effect_size_guess: string;
}

interface Hypothesis {
  id: string;
  hypothesis: string;
  independent_variables: string[];
  dependent_variables: string[];
  controls: string[];
  experimental_design: string;
  metrics_expected_effect: HypothesisMetric[];
  data_requirements: string[];
  confounders: string[];
  threats_to_validity: string[];
}

interface AhaPack {
  rq: string;
  hypotheses: Hypothesis[];
}

interface Props {
  insight: InsightItem;
  pdfBase64: string;
  language: Language;
  onClose: () => void;
}

const AhaModeOverlay: React.FC<Props> = ({ insight, pdfBase64, language, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [pack, setPack] = useState<AhaPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = TRANSLATIONS[language];

  const handleGenerate = async () => {
    setStatus('generating');
    setError(null);
    try {
      const result = await generateAhaPack(insight.title, insight.actionableNextStep, pdfBase64, language);
      setPack(result);
      setStatus('done');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate hypothesis pack.");
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-400 border border-white/20">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{t.ahaTitle}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{insight.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all hover:rotate-90 duration-300">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-10">
            
            {/* Top Insight Context */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-indigo-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">{t.nextStep}</h4>
                    <p className="text-lg text-indigo-900 font-bold leading-relaxed">{insight.actionableNextStep}</p>
                </div>
            </div>

            {status === 'idle' && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-100">
                    <FlaskConical size={40} className="text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Ready to deep-dive?</h3>
                <p className="text-slate-500 max-w-sm mb-8">BrainLens will architect a formal experimental protocol based on this insight.</p>
                <button 
                  onClick={handleGenerate}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 uppercase tracking-widest text-sm"
                >
                  <Zap size={20} fill="currentColor" /> {t.generateAha}
                </button>
              </div>
            )}

            {status === 'generating' && (
              <div className="flex flex-col items-center py-20">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                    <Loader2 size={64} className="text-indigo-600 animate-spin relative" />
                </div>
                <p className="font-black text-slate-800 text-sm uppercase tracking-[0.2em] animate-pulse">Architecting Protocol...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-start gap-4 animate-in shake duration-500">
                <AlertCircle className="text-rose-500 shrink-0 mt-1" size={24} />
                <div className="space-y-4">
                  <p className="text-rose-900 font-bold">{error}</p>
                  <button onClick={handleGenerate} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest">Retry Generation</button>
                </div>
              </div>
            )}

            {status === 'done' && pack && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* RQ */}
                <section>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Target size={14} className="text-indigo-500" /> {t.rq}
                   </h3>
                   <div className="text-3xl font-black text-slate-900 leading-tight tracking-tighter">
                      {pack.rq}
                   </div>
                </section>

                {/* Hypotheses */}
                <div className="space-y-16">
                  {pack.hypotheses.map((h, i) => (
                    <div key={h.id || i} className="space-y-8">
                       <div className="flex items-center gap-4">
                          <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{h.id}</span>
                          <h4 className="text-2xl font-black text-slate-800 tracking-tight">{h.hypothesis}</h4>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          {/* Variables */}
                          <div className="space-y-6">
                             <div>
                                <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Independent Variables</h5>
                                <div className="flex flex-wrap gap-2">
                                   {h.independent_variables.map(v => <span key={v} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100">{v}</span>)}
                                </div>
                             </div>
                             <div>
                                <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Dependent Variables</h5>
                                <div className="flex flex-wrap gap-2">
                                   {h.dependent_variables.map(v => <span key={v} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">{v}</span>)}
                                </div>
                             </div>
                             <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Experimental Design</h5>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{h.experimental_design}</p>
                             </div>
                          </div>

                          {/* Metrics & Validity */}
                          <div className="space-y-6">
                             <div>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Expected Effects</h5>
                                <div className="space-y-3">
                                   {h.metrics_expected_effect.map((m, mi) => (
                                     <div key={mi} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">{m.metric}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${m.expected_direction === 'increase' ? 'bg-emerald-100 text-emerald-700' : m.expected_direction === 'decrease' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {m.expected_direction}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">{m.effect_size_guess}</span>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                             <div>
                                <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><ShieldCheck size={12}/> Threats to Validity</h5>
                                <ul className="space-y-2">
                                   {h.threats_to_validity.map((t, ti) => <li key={ti} className="text-xs text-rose-600 font-medium flex gap-2"><span>•</span> {t}</li>)}
                                </ul>
                             </div>
                          </div>
                       </div>
                       
                       {i < pack.hypotheses.length - 1 && <hr className="border-slate-100" />}
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                        <div>
                            <p className="text-sm font-bold text-white">Scientific Pack Completed</p>
                            <p className="text-xs text-slate-400">Grounding verified against original source PDF.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Done</button>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AhaModeOverlay;
