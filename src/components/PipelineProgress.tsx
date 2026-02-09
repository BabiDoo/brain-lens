
import React from 'react';
import { Language, PipelineStep } from '../types';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface Props {
  currentStep: PipelineStep;
  language?: Language;
}

const steps: { id: PipelineStep; labelKey: keyof typeof TRANSLATIONS.en.pipeline }[] = [
  { id: 'ingest', labelKey: 'ingest' },
  { id: 'figures', labelKey: 'figures' },
  { id: 'claims', labelKey: 'claims' },
  { id: 'check', labelKey: 'check' },
  { id: 'insights', labelKey: 'insights' },
  { id: 'podcast', labelKey: 'podcast' },
  { id: 'compose', labelKey: 'compose' },
];

const PipelineProgress: React.FC<Props> = ({ currentStep, language = 'en' }) => {
  const t = TRANSLATIONS[language];

  const getStatus = (stepId: string) => {
    const stepOrder = ['idle', 'ingest', 'figures', 'claims', 'check', 'insights', 'podcast', 'compose', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (currentStep === 'complete') return 'completed';
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  if (currentStep === 'idle') return null;

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-4 shadow-sm relative z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1 flex items-center justify-between">
          {steps.map((step, idx) => {
            const status = getStatus(step.id);
            const label = t.pipeline[step.labelKey];
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`flex items-center space-x-2 ${idx !== steps.length - 1 ? 'w-full' : ''}`}>
                  <div className="relative flex flex-col items-center group">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${status === 'completed' ? 'bg-indigo-600 border-indigo-600 text-white' : ''}
                      ${status === 'active' ? 'border-indigo-600 text-indigo-600' : ''}
                      ${status === 'pending' ? 'border-slate-300 text-slate-300' : ''}
                    `}>
                      {status === 'completed' ? (
                        <CheckCircle size={16} />
                      ) : status === 'active' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Circle size={16} />
                      )}
                    </div>
                    <span className={`absolute top-10 text-[10px] font-bold whitespace-nowrap uppercase tracking-tighter ${
                      status === 'pending' ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      {label}
                    </span>
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className={`h-0.5 w-full mx-2 transition-all duration-500 ${
                      status === 'completed' ? 'bg-indigo-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PipelineProgress;
