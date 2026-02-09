
import React, { useState } from "react";
import { Citation, ChatMessage, Language } from "../types";
import { SUGGESTED_PROMPTS, TRANSLATIONS } from "../constants";
import { SendHorizonal, Bot, User } from "lucide-react";

type Props = {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  onCitationClick?: (c: Citation) => void;
  language?: Language;
};

type ParsedCitation = {
  label: string; // e.g. "Page 9" or "Fig 5"
  page?: number;
  sourceId?: string; // "Fig 5" | "Table 2"
};

function parseCitations(text: string): ParsedCitation[] {
  const results: ParsedCitation[] = [];
  const matches = text.match(/\[([^\]]+)\]/g);
  if (!matches) return results;

  for (const raw of matches) {
    const inside = raw.slice(1, -1).trim();
    const parts = inside.split(",").map((p) => p.trim());

    for (const p of parts) {
      const pageMatch = p.match(/page\s*(\d+)|p\.\s*(\d+)/i);
      if (pageMatch) {
        const page = Number(pageMatch[1] || pageMatch[2]);
        results.push({ label: `Page ${page}`, page });
        continue;
      }
      const figMatch = p.match(/fig(?:ure)?\s*(\d+)/i);
      if (figMatch) {
        const n = figMatch[1];
        results.push({ label: `Fig ${n}`, sourceId: `Fig ${n}` });
        continue;
      }
      const tableMatch = p.match(/table\s*(\d+)/i);
      if (tableMatch) {
        const n = tableMatch[1];
        results.push({ label: `Table ${n}`, sourceId: `Table ${n}` });
        continue;
      }
    }
  }

  // Deduplicate by label
  const uniq = new Map<string, ParsedCitation>();
  for (const r of results) uniq.set(r.label, r);
  return Array.from(uniq.values());
}

function stripCitationBrackets(text: string) {
  return text.replace(/\s*\[[^\]]+\]\s*/g, " ").replace(/\s+/g, " ").trim();
}

function extractCitationContext(fullText: string, citation: ParsedCitation): string {
    // Attempt to find the sentence preceding the citation
    const isPage = !!citation.page;
    const searchVal = isPage ? citation.page?.toString() : citation.sourceId?.replace(/^(Fig|Table)\s*/, '');
    
    if (!searchVal) return "Citation reference from answer.";

    // Regex to find bracket groups
    const bracketRegex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = bracketRegex.exec(fullText)) !== null) {
        const content = match[1]; 
        const lowerContent = content.toLowerCase();
        
        // Check if this bracket contains our target
        let found = false;
        if (isPage) {
            // Match "page X", "p.X", "p. X"
            if (lowerContent.includes(`page ${searchVal}`) || 
                lowerContent.includes(`p.${searchVal}`) || 
                lowerContent.includes(`p. ${searchVal}`)) {
                found = true;
            }
        } else {
            // Match "fig X", "table X"
            const type = citation.label.split(' ')[0].toLowerCase();
            if (lowerContent.includes(type) && lowerContent.includes(searchVal.toLowerCase())) {
                found = true;
            }
        }

        if (found) {
            const textBefore = fullText.substring(0, match.index);
            // Get last sentence-like chunk
            // 1. Split by newlines to handle paragraphs
            const paragraphs = textBefore.split('\n');
            const lastParagraph = paragraphs[paragraphs.length - 1];
            // 2. Split by sentence terminators
            const sentences = lastParagraph.split(/(?<=[.!?])\s+/);
            const lastSentence = sentences[sentences.length - 1];
            return lastSentence.trim().replace(/\*\*/g, '') || "Citation reference.";
        }
    }
    
    return "Citation reference from answer.";
}

const FormattedText = ({ text }: { text: string }) => {
  const processBold = (str: string) => {
    return str.split(/(\*\*.*?\*\*)/g).map((part, i) => 
      part.startsWith('**') && part.endsWith('**') 
        ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong> 
        : part
    );
  };

  const blocks: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  
  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`list-${blocks.length}`} className="list-disc pl-5 mb-3 space-y-1 marker:text-indigo-400">
          {[...currentList]}
        </ul>
      );
      currentList = [];
    }
  };

  const lines = text.split('\n');
  
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) {
        flushList();
        return;
    }
    
    if (line.startsWith('* ') || line.startsWith('- ')) {
      const content = line.substring(2);
      currentList.push(<li key={`li-${i}`} className="pl-1">{processBold(content)}</li>);
    } else {
      flushList();
      blocks.push(
        <p key={`p-${i}`} className="mb-3 last:mb-0 leading-relaxed text-slate-700">
          {processBold(line)}
        </p>
      );
    }
  });
  
  flushList();

  return <>{blocks}</>;
};

export default function AskView({
  messages,
  onSendMessage,
  isLoading,
  onCitationClick,
  language = 'en',
}: Props) {
  const [input, setInput] = useState("");
  const t = TRANSLATIONS[language];
  const suggestedPrompts = SUGGESTED_PROMPTS[language];

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    onSendMessage(msg);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 py-8">
                <p className="text-sm font-medium text-center px-4">{t.askPlaceholder.replace('...', '')}</p>
                <div className="grid gap-2 w-full max-w-sm">
                    {suggestedPrompts.map((p) => (
                    <button
                        key={p}
                        onClick={() => onSendMessage(p)}
                        className="text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-700 transition text-slate-600 text-sm"
                    >
                        {p}
                    </button>
                    ))}
                </div>
            </div>
        )}

        {messages.map((m, idx) => {
          const isModel = m.role === "model";
          const citations = isModel ? parseCitations(m.content) : [];
          const cleanText = isModel ? stripCitationBrackets(m.content) : m.content;

          return (
            <div
              key={idx}
              className={`flex gap-3 ${isModel ? "justify-start" : "justify-end"}`}
            >
              {isModel && (
                 <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-indigo-600" />
                 </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 border shadow-sm text-sm ${
                  isModel
                    ? "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                    : "bg-slate-900 border-slate-900 text-white rounded-tr-none"
                }`}
              >
                {/* Render content */}
                {isModel ? (
                    <FormattedText text={cleanText} />
                ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{cleanText}</div>
                )}

                {/* Citation chips */}
                {isModel && citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {citations.map((c) => {
                      const clickable = Boolean(onCitationClick);
                      return (
                        <button
                          key={c.label}
                          onClick={() => {
                            if (!onCitationClick) return;
                            // Extract context dynamically from the original raw content
                            const context = extractCitationContext(m.content, c);
                            
                            onCitationClick({
                              page: c.page ?? 0,
                              text: context,
                              sourceId: c.sourceId,
                            });
                          }}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                            clickable
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:scale-105"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                          title={clickable ? t.sourceViewer : undefined}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {!isModel && (
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-slate-500" />
                 </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                 <Bot size={16} className="text-indigo-300" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={t.askPlaceholder}
            className="flex-1 pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 px-3 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition flex items-center justify-center"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
