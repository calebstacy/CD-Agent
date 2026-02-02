import { useState, useEffect, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
}

interface ThinkingStepsProps {
  isGenerating: boolean;
  userMessage?: string;
}

// Detect task type from user message and return relevant steps
function getContextualSteps(message: string): ThinkingStep[] {
  const lowerMessage = message.toLowerCase();
  
  // Button/CTA copy
  if (lowerMessage.includes('button') || lowerMessage.includes('cta') || lowerMessage.includes('call to action')) {
    return [
      { id: '1', label: 'Checking character limits for buttons', status: 'pending' },
      { id: '2', label: 'Reviewing action verb patterns', status: 'pending' },
      { id: '3', label: 'Evaluating urgency and clarity', status: 'pending' },
    ];
  }
  
  // Error messages
  if (lowerMessage.includes('error') || lowerMessage.includes('warning') || lowerMessage.includes('alert')) {
    return [
      { id: '1', label: 'Analyzing error context', status: 'pending' },
      { id: '2', label: 'Checking tone for empathy', status: 'pending' },
      { id: '3', label: 'Reviewing recovery actions', status: 'pending' },
    ];
  }
  
  // Onboarding/welcome
  if (lowerMessage.includes('onboarding') || lowerMessage.includes('welcome') || lowerMessage.includes('first time')) {
    return [
      { id: '1', label: 'Considering user mental model', status: 'pending' },
      { id: '2', label: 'Reviewing progressive disclosure', status: 'pending' },
      { id: '3', label: 'Checking motivational language', status: 'pending' },
    ];
  }
  
  // Empty states
  if (lowerMessage.includes('empty state') || lowerMessage.includes('no results') || lowerMessage.includes('nothing')) {
    return [
      { id: '1', label: 'Analyzing empty state context', status: 'pending' },
      { id: '2', label: 'Reviewing helpful next actions', status: 'pending' },
      { id: '3', label: 'Checking encouraging tone', status: 'pending' },
    ];
  }
  
  // Form labels/inputs
  if (lowerMessage.includes('form') || lowerMessage.includes('input') || lowerMessage.includes('field') || lowerMessage.includes('label')) {
    return [
      { id: '1', label: 'Checking label clarity', status: 'pending' },
      { id: '2', label: 'Reviewing placeholder patterns', status: 'pending' },
      { id: '3', label: 'Evaluating helper text needs', status: 'pending' },
    ];
  }
  
  // Navigation/menu
  if (lowerMessage.includes('nav') || lowerMessage.includes('menu') || lowerMessage.includes('tab')) {
    return [
      { id: '1', label: 'Checking information architecture', status: 'pending' },
      { id: '2', label: 'Reviewing label scannability', status: 'pending' },
      { id: '3', label: 'Evaluating hierarchy clarity', status: 'pending' },
    ];
  }
  
  // Notification/toast
  if (lowerMessage.includes('notification') || lowerMessage.includes('toast') || lowerMessage.includes('success')) {
    return [
      { id: '1', label: 'Checking message brevity', status: 'pending' },
      { id: '2', label: 'Reviewing confirmation clarity', status: 'pending' },
      { id: '3', label: 'Evaluating actionability', status: 'pending' },
    ];
  }
  
  // Modal/dialog
  if (lowerMessage.includes('modal') || lowerMessage.includes('dialog') || lowerMessage.includes('popup') || lowerMessage.includes('confirm')) {
    return [
      { id: '1', label: 'Analyzing dialog purpose', status: 'pending' },
      { id: '2', label: 'Checking action button clarity', status: 'pending' },
      { id: '3', label: 'Reviewing dismissal options', status: 'pending' },
    ];
  }
  
  // Headline/title
  if (lowerMessage.includes('headline') || lowerMessage.includes('title') || lowerMessage.includes('heading')) {
    return [
      { id: '1', label: 'Checking headline impact', status: 'pending' },
      { id: '2', label: 'Reviewing keyword placement', status: 'pending' },
      { id: '3', label: 'Evaluating scannability', status: 'pending' },
    ];
  }
  
  // Tooltip/help text
  if (lowerMessage.includes('tooltip') || lowerMessage.includes('help') || lowerMessage.includes('hint')) {
    return [
      { id: '1', label: 'Checking contextual relevance', status: 'pending' },
      { id: '2', label: 'Reviewing brevity', status: 'pending' },
      { id: '3', label: 'Evaluating timing appropriateness', status: 'pending' },
    ];
  }
  
  // Image analysis (screenshot/image mentioned)
  if (lowerMessage.includes('image') || lowerMessage.includes('screenshot') || lowerMessage.includes('screen') || lowerMessage.includes('ui')) {
    return [
      { id: '1', label: 'Analyzing UI context', status: 'pending' },
      { id: '2', label: 'Identifying copy opportunities', status: 'pending' },
      { id: '3', label: 'Reviewing visual hierarchy', status: 'pending' },
    ];
  }
  
  // Default - generic content design steps (shorter list)
  return [
    { id: '1', label: 'Understanding context', status: 'pending' },
    { id: '2', label: 'Generating options', status: 'pending' },
  ];
}

export function ThinkingSteps({ isGenerating, userMessage = '' }: ThinkingStepsProps) {
  const contextualSteps = useMemo(() => getContextualSteps(userMessage), [userMessage]);
  const [steps, setSteps] = useState<ThinkingStep[]>(contextualSteps);
  const [currentStep, setCurrentStep] = useState(0);

  // Reset steps when message changes
  useEffect(() => {
    setSteps(contextualSteps.map(s => ({ ...s, status: 'pending' })));
    setCurrentStep(0);
  }, [userMessage]);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    // Reset and start animation
    setSteps(contextualSteps.map(s => ({ ...s, status: 'pending' })));
    setCurrentStep(0);

    // Animate through steps
    const stepDuration = 1200; // ms per step - slower for more natural feel
    
    // Mark first step as active immediately
    setTimeout(() => {
      setSteps(prevSteps => prevSteps.map((step, idx) => 
        idx === 0 ? { ...step, status: 'active' } : step
      ));
    }, 100);

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= contextualSteps.length) {
          // Keep last step spinning until response arrives
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

    return () => clearInterval(interval);
  }, [isGenerating, contextualSteps]);

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
                <Check className="w-4 h-4 text-green-500 animate-in zoom-in duration-300" strokeWidth={2.5} />
              )}
              {step.status === 'active' && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" strokeWidth={2.5} />
              )}
              {step.status === 'pending' && (
                <div className="w-2 h-2 rounded-full bg-neutral-500" />
              )}
            </div>
            
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                step.status === 'active'
                  ? 'text-neutral-200'
                  : step.status === 'complete'
                  ? 'text-neutral-400'
                  : 'text-neutral-500'
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
