import React from 'react';
import { BriefingSlide, Citation, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { FileText, BookOpen } from 'lucide-react';

interface Props {
  slides: BriefingSlide[];
  onCitationClick: (citation: Citation) => void;
  language?: Language;
}

const BriefingView: React.FC<Props> = ({ slides, onCitationClick, language = 'en' }) => {
  const t = TRANSLATIONS[language];

  if (slides.length === 0) return <div className="p-8 text-center text-slate-500">No briefing available. Run the pipeline first.</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {slides.map((slide, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{t.slide} {idx + 1}</span>
            <h3 className="text-lg font-semibold text-slate-800">{slide.title}</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {slide.points.map((point, pIdx) => (
                <li key={pIdx} className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  <div className="text-slate-600 leading-relaxed">
                    {point.text}
                    {point.citation && (
                      <button
                        onClick={() => onCitationClick(point.citation!)}
                        className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer border border-indigo-200"
                      >
                        <BookOpen size={10} />
                        {point.citation.sourceId || `p.${point.citation.page}`}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BriefingView;