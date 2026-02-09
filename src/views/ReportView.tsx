
import React, { useMemo } from 'react';
import { AppState, BriefingSlide, EvidenceCard, ConsistencyCheck, InsightItem } from '../types';
import { FileCode, AlertCircle, Copy, Check } from 'lucide-react';

interface Props {
  state: AppState;
}

/**
 * Utilitário para limpar campos de mídia e normalizar o conteúdo
 */
const normalizeData = (state: AppState) => {
  const warnings: string[] = [];

  // 1. Briefing
  const briefing = state.briefing.flatMap((slide: BriefingSlide) => 
    slide.points.map(p => ({
      id: `briefing-${Math.random().toString(36).substr(2, 5)}`,
      source_tab: "briefing",
      conteudo_completo: {
        title: slide.title,
        content: p.text,
        joined: `${slide.title}: ${p.text}`
      },
      table: p.citation?.sourceId?.startsWith('Table') ? p.citation.sourceId : null,
      pag: p.citation?.page || null,
      analysis: null,
      confidence: "High", // Briefing assume alta confiança na síntese
      quote: p.citation?.text || null,
      reference: p.citation?.sourceId || null,
      tags_extra: {}
    }))
  );
  if (state.briefing.length === 0) warnings.push("Briefing section is empty.");

  // 2. Evidence Cards
  const evidence_cards = state.evidenceCards.map((card: EvidenceCard) => ({
    id: card.id,
    source_tab: "evidence_cards",
    conteudo_completo: {
      title: card.caption,
      content: card.description,
      joined: `${card.caption} - ${card.description}`
    },
    table: card.type === 'table' ? card.id : null,
    pag: card.page,
    analysis: card.relevance,
    confidence: "High",
    quote: null,
    reference: card.id,
    tags_extra: { type: card.type }
  }));
  if (state.evidenceCards.length === 0) warnings.push("Evidence Cards section is empty.");

  // 3. Consistency
  const consistency = state.consistencyReport.map((c: ConsistencyCheck) => ({
    id: `consistency-${Math.random().toString(36).substr(2, 5)}`,
    source_tab: "consistency",
    conteudo_completo: {
      title: c.claim,
      content: c.explanation,
      joined: `${c.claim}: ${c.explanation}`
    },
    table: null,
    pag: c.citation?.page || null,
    analysis: c.status,
    confidence: c.confidence,
    quote: c.citation?.text || null,
    reference: null,
    tags_extra: { status: c.status }
  }));
  if (state.consistencyReport.length === 0) warnings.push("Consistency section is empty.");

  // 4. Insights
  const insights = state.insights.map((ins: InsightItem) => ({
    id: ins.id,
    source_tab: "insights",
    conteudo_completo: {
      title: ins.title,
      content: ins.insight,
      joined: `${ins.title} -> ${ins.insight}`
    },
    table: ins.grounding.status === 'Grounded' ? ins.grounding.citations.find(c => c.sourceId?.startsWith('Table'))?.sourceId : null,
    pag: ins.grounding.status === 'Grounded' ? ins.grounding.citations[0]?.page : null,
    analysis: ins.whyItMatters,
    confidence: ins.confidence,
    quote: ins.grounding.status === 'Grounded' ? ins.grounding.citations[0]?.text : null,
    reference: ins.grounding.status === 'Grounded' ? ins.grounding.citations[0]?.sourceId : null,
    tags_extra: { 
      kind: ins.kind, 
      next_step: ins.actionableNextStep,
      grounding_status: ins.grounding.status 
    }
  }));
  if (state.insights.length === 0) warnings.push("Insights section is empty.");

  return {
    meta: {
      generated_at: new Date().toISOString(),
      version: "1.0",
      source: "Paper Pilot",
      language: state.language,
      fileName: state.fileName
    },
    sections: {
      briefing,
      evidence_cards,
      consistency,
      insights
    },
    warnings
  };
};

const ReportView: React.FC<Props> = ({ state }) => {
  const [copied, setCopied] = React.useState(false);

  const reportJson = useMemo(() => normalizeData(state), [state]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(reportJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-700 animate-in fade-in duration-500">
      {/* Header Toolbar */}
      <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <FileCode className="text-indigo-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">Aggregated Report</h3>
            <p className="text-slate-400 text-xs">Structured JSON output (Media-Free)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {reportJson.warnings.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20 text-[10px] font-bold">
              <AlertCircle size={12} /> {reportJson.warnings.length} WARNINGS
            </div>
          )}
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors border border-slate-600"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed custom-scrollbar">
        <pre className="text-indigo-300">
          {JSON.stringify(reportJson, null, 2)}
        </pre>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-800/50 px-6 py-3 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500">
        <span>Normalizer: v1.0.2</span>
        <span>Total Records: {
          reportJson.sections.briefing.length + 
          reportJson.sections.evidence_cards.length + 
          reportJson.sections.consistency.length + 
          reportJson.sections.insights.length
        }</span>
      </div>
    </div>
  );
};

export default ReportView;
