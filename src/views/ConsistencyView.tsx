import React from 'react';
import { ConsistencyCheck, Citation, Language } from '../types';
import { CheckCircle, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  report: ConsistencyCheck[];
  onCitationClick: (citation: Citation) => void;
  language?: Language;
}

const ConsistencyView: React.FC<Props> = ({ report, onCitationClick, language = 'en' }) => {
  const t = TRANSLATIONS[language];

  if (report.length === 0) return <div className="p-8 text-center text-slate-500">No report available.</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {report.map((item, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 flex gap-4">
            <div className="flex-shrink-0 mt-1">
              {item.status === 'Supported' && <CheckCircle className="text-emerald-500" size={24} />}
              {item.status === 'Weak' && <AlertTriangle className="text-amber-500" size={24} />}
              {item.status === 'Not Found' && <XCircle className="text-rose-500" size={24} />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-slate-900 text-base">{item.claim}</h4>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  item.confidence === 'High' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {item.confidence === 'High' ? t.confHigh : item.confidence === 'Medium' ? t.confMed : t.confLow}
                </span>
              </div>
              
              <p className="text-sm text-slate-600">{item.explanation}</p>
              
              {item.citation && (
                <button 
                  onClick={() => onCitationClick(item.citation!)}
                  className="mt-2 text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <span className="bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                    {t.verifyQuote} {item.citation.page}
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className={`h-1 w-full ${
             item.status === 'Supported' ? 'bg-emerald-500' : 
             item.status === 'Weak' ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
        </div>
      ))}
    </div>
  );
};

export default ConsistencyView;