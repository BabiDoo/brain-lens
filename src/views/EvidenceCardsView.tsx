
import React, { useState, useEffect } from 'react';
import { EvidenceCard, Citation, Language } from '../types';
import { Image, Table as TableIcon, ZoomIn, X, Maximize2 } from 'lucide-react';
import PdfThumbnail from '../components/PdfThumbnail';
import { TRANSLATIONS } from '../constants';

interface Props {
  cards: EvidenceCard[];
  onCardClick: (citation: Citation) => void;
  pdfBase64?: string | null;
  language?: Language;
}

const EvidenceCardsView: React.FC<Props> = ({ cards, onCardClick, pdfBase64, language = 'en' }) => {
  const [viewingCard, setViewingCard] = useState<EvidenceCard | null>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (viewingCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [viewingCard]);

  if (cards.length === 0) return <div className="p-12 text-center text-slate-400 font-medium">No evidence found in this paper.</div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col overflow-hidden ring-1 ring-transparent hover:ring-indigo-100"
            onClick={() => {
              if (pdfBase64) {
                setViewingCard(card);
              } else {
                onCardClick({ page: card.page, text: card.caption, sourceId: card.id });
              }
            }}
          >
            <div className="aspect-[4/3] bg-slate-50 border-b border-slate-100 relative overflow-hidden">
              {pdfBase64 ? (
                <PdfThumbnail pdfBase64={pdfBase64} pageNumber={card.page} scale={1.0} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200">
                  {card.type === 'figure' ? <Image size={56} /> : <TableIcon size={56} />}
                </div>
              )}

              <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-white shadow-lg flex items-center gap-2 uppercase tracking-[0.15em]">
                {card.type === 'figure' ? <Image size={12} className="text-indigo-400" /> : <TableIcon size={12} className="text-emerald-400" />}
                {card.id}
              </div>

              <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                <div className="bg-white text-indigo-700 px-5 py-2.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                  <Maximize2 size={16} />
                  {t.viewFullSize}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={card.caption}>
                  {card.caption}
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-black px-2 py-1 rounded-md uppercase">P.{card.page}</span>
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-4 text-xs text-slate-600 border border-slate-100 flex-1 leading-relaxed">
                <span className="font-black text-slate-400 block mb-2 uppercase tracking-widest text-[9px]">{t.analysis}</span>
                {card.description}
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-50">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Grounding Engine</span>
                <button
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"
                >
                  {t.inspectEvidence} <ZoomIn size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewingCard && pdfBase64 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 p-4 md:p-12"
          onClick={() => setViewingCard(null)}
        >
          <div
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-full flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-400 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 uppercase tracking-widest border border-indigo-100">
                  {viewingCard.type === 'figure' ? <Image size={14} /> : <TableIcon size={14} />}
                  {viewingCard.id}
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <span className="text-slate-500 font-black text-xs uppercase tracking-widest">Page {viewingCard.page}</span>
              </div>

              <button
                onClick={() => setViewingCard(null)}
                className="p-3 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all hover:rotate-90 duration-300"
              >
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 relative overflow-auto p-4 md:p-12 flex justify-center items-start custom-scrollbar">
              <PdfThumbnail
                pdfBase64={pdfBase64}
                pageNumber={viewingCard.page}
                scale={2.2}
                contain={false}
                className="bg-white shadow-2xl rounded-2xl"
              />
            </div>

            <div className="bg-white px-10 py-8 border-t border-slate-100 z-10 shrink-0">
              <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Verified Caption</h5>
              <p className="text-lg text-slate-800 font-bold leading-relaxed">
                {viewingCard.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EvidenceCardsView;
