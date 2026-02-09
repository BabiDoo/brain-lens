
import React from 'react';
import { InsightItem, Citation, Language } from '../types';
import { Lightbulb, ArrowRight, AlertTriangle, BookOpen, Sparkles, Zap } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  items: InsightItem[];
  onCitationClick: (citation: Citation) => void;
  onAhaClick?: (item: InsightItem) => void;
  language?: Language;
}

const InsightsView: React.FC<Props> = ({ items, onCitationClick, onAhaClick, language = 'en' }) => {
  const t = TRANSLATIONS[language];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500 space-y-4">
        <Sparkles size={48} className="text-slate-300" />
        <p>No insights generated. Upload a PDF to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
          <div className="px-6 py-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                  {item.kind}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  item.confidence === 'High' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : item.confidence === 'Medium' 
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                   {item.confidence === 'High' ? t.confHigh : item.confidence === 'Medium' ? t.confMed : t.confLow}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
            
            <p className="text-slate-700 leading-relaxed mb-4">
              {item.insight}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">{t.whyItMatters}</span>
                  <p className="text-sm text-slate-800 leading-relaxed">{item.whyItMatters}</p>
               </div>
               
               <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex flex-col justify-between group min-h-[120px]">
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-indigo-500 block mb-2 uppercase tracking-widest flex items-center gap-1.5">
                      <ArrowRight size={12}/> {t.nextStep}
                    </span>
                    <p className="text-sm text-indigo-900 font-bold leading-relaxed">{item.actionableNextStep}</p>
                  </div>
                  
                  {onAhaClick && (
                    <div className="flex justify-end">
                      <button 
                        onClick={() => onAhaClick(item)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[11px] font-black rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest"
                      >
                        <Zap size={14} fill="currentColor" />
                        {t.ahaButton}
                      </button>
                    </div>
                  )}
               </div>
            </div>

            {/* Grounding / Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-start gap-3">
              {item.grounding.status === 'Grounded' ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <BookOpen size={14} /> {t.evidenceLabel}
                  </span>
                  {item.grounding.citations.map((cite, i) => (
                    <button
                      key={i}
                      onClick={() => onCitationClick({ 
                        page: cite.page || 0, 
                        text: cite.text || item.insight, 
                        sourceId: cite.sourceId 
                      })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200"
                    >
                      {cite.sourceId || (cite.page ? `p.${cite.page}` : 'Ref')}
                    </button>
                  ))}
                </div>
              ) : (
                 <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg w-full">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                    <div>
                      <span className="font-bold block">{t.speculative}</span>
                      {item.grounding.reason}
                      {item.grounding.suggestedWhereToCheck && (
                        <span className="block mt-1 text-amber-600">
                           {t.check} {item.grounding.suggestedWhereToCheck.join(', ')}
                        </span>
                      )}
                    </div>
                 </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsightsView;
