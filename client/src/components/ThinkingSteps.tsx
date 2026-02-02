import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

interface ThinkingStepsProps {
  isGenerating: boolean;
}

const CONTENT_DESIGN_STEPS: ThinkingStep[] = [
  { id: '1', label: 'Considering design standards', status: 'pending' },
  { id: '2', label: 'Checking character count for component', status: 'pending' },
  { id: '3', label: 'Reviewing relevant UXR insights', status: 'pending' },
  { id: '4', label: 'Comparing familiar patterns from codebase', status: 'pending' },
  { id: '5', label: 'Evaluating tone and voice consistency', status: 'pending' },
  { id: '6', label: 'Analyzing accessibility requirements', status: 'pending' },
];

export function ThinkingSteps({ isGenerating }: ThinkingStepsProps) {
  const [steps, setSteps] = useState<ThinkingStep[]>(CONTENT_DESIGN_STEPS);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      // Reset all steps when not generating
      setSteps(CONTENT_DESIGN_STEPS.map(s => ({ ...s, status: 'pending' })));
      setCurrentStep(0);
      return;
    }

    // Animate through steps
    const stepDuration = 800; // ms per step
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= steps.length) {
          clearInterval(interval);
          return prev;
        }
        
        // Update step statuses
        setSteps(prevSteps => prevSteps.map((step, idx) => {
          if (idx < next) return { ...step, status: 'complete' };
          if (idx === next) return { ...step, status: 'active' };
          return step;
        }));
        
        return next;
      });
    }, stepDuration);

    // Mark first step as active immediately
    setSteps(prevSteps => prevSteps.map((step, idx) => 
      idx === 0 ? { ...step, status: 'active' } : step
    ));

    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-10 h-10 rounded-2xl bg-neutral-800 flex items-center justify-center flex-shrink-0 mt-1">
        <div className="w-5 h-5 relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>
      
      <div className="flex flex-col gap-2 max-w-2xl">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 transition-all duration-500 ${
              step.status === 'pending' ? 'opacity-30' : 'opacity-100'
            }`}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              {step.status === 'complete' && (
                <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-300" strokeWidth={2.5} />
              )}
              {step.status === 'active' && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" strokeWidth={2.5} />
              )}
              {step.status === 'pending' && (
                <div className="w-2 h-2 rounded-full bg-neutral-300" />
              )}
            </div>
            
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                step.status === 'active'
                  ? 'text-neutral-900 animate-pulse'
                  : step.status === 'complete'
                  ? 'text-neutral-600'
                  : 'text-neutral-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
