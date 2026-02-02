import { useState } from 'react';
import { Copy, Check, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ArtifactProps {
  type: 'copy-options' | 'ui-preview' | 'before-after' | 'empty-state';
  content: string;
  title?: string;
  onIterate?: (option: string, action: string) => void;
}

export function ArtifactRenderer({ type, content, title, onIterate }: ArtifactProps) {
  switch (type) {
    case 'copy-options':
      return <CopyOptionsArtifact content={content} title={title} onIterate={onIterate} />;
    case 'ui-preview':
      return <UIPreviewArtifact content={content} title={title} onIterate={onIterate} />;
    case 'before-after':
      return <BeforeAfterArtifact content={content} title={title} onIterate={onIterate} />;
    case 'empty-state':
      return <EmptyStateArtifact content={content} title={title} onIterate={onIterate} />;
    default:
      return null;
  }
}

function CopyOptionsArtifact({ content, title, onIterate }: { content: string; title?: string; onIterate?: (option: string, action: string) => void }) {
  const options = content.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim());
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="my-6 rounded-2xl border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-sm overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 border-b border-neutral-700/50 cursor-pointer hover:bg-neutral-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{title || 'Copy options'}</h4>
            <p className="text-xs text-neutral-400">{options.length} variations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 px-2 py-1 rounded-full bg-neutral-700/50">
            Click to iterate
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </div>
      
      {/* Options */}
      <div className={cn(
        "transition-all duration-300 ease-out",
        isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
      )}>
        <div className="p-4 space-y-2">
          {options.map((option, idx) => (
            <CopyOption 
              key={idx} 
              text={option} 
              index={idx + 1} 
              onIterate={onIterate}
              animationDelay={idx * 100}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CopyOption({ text, index, onIterate, animationDelay = 0 }: { 
  text: string; 
  index: number; 
  onIterate?: (option: string, action: string) => void;
  animationDelay?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const charCount = text.length;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleIterate = (action: string) => {
    if (onIterate) {
      onIterate(text, action);
    }
    setShowActions(false);
  };

  return (
    <div 
      className="group relative animate-in fade-in slide-in-from-left-2"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div 
        className={cn(
          "flex items-start gap-3 rounded-xl border border-neutral-700/50 bg-neutral-900/50 px-4 py-3.5",
          "transition-all duration-200 cursor-pointer",
          "hover:border-blue-500/50 hover:bg-neutral-800/80 hover:shadow-lg hover:shadow-blue-500/5",
          showActions && "border-blue-500/50 bg-neutral-800/80"
        )}
        onClick={() => setShowActions(!showActions)}
      >
        {/* Index badge */}
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-700 text-xs font-medium text-neutral-300 flex-shrink-0 mt-0.5">
          {index}
        </span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-[15px] text-neutral-100 leading-relaxed">{text}</span>
          
          {/* Character count badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              charCount <= 20 ? "bg-green-500/20 text-green-400" :
              charCount <= 40 ? "bg-yellow-500/20 text-yellow-400" :
              "bg-orange-500/20 text-orange-400"
            )}>
              {charCount} chars
            </span>
            {charCount <= 20 && (
              <span className="text-xs text-neutral-500">Great for buttons</span>
            )}
            {charCount > 20 && charCount <= 40 && (
              <span className="text-xs text-neutral-500">Good for labels</span>
            )}
            {charCount > 40 && (
              <span className="text-xs text-neutral-500">Better for descriptions</span>
            )}
          </div>
        </div>
        
        {/* Copy button - always visible on hover */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-all duration-200 h-8 w-8 p-0",
            "hover:bg-blue-500/20 hover:text-blue-400",
            copied && "opacity-100"
          )}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-neutral-400" />
          )}
        </Button>
      </div>
      
      {/* Iteration actions - slide down when clicked */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        showActions ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        <div className="flex flex-wrap gap-2 px-2">
          <IterateButton label="Shorter" onClick={() => handleIterate('shorter')} />
          <IterateButton label="Longer" onClick={() => handleIterate('longer')} />
          <IterateButton label="More casual" onClick={() => handleIterate('more casual')} />
          <IterateButton label="More formal" onClick={() => handleIterate('more formal')} />
          <IterateButton label="More urgent" onClick={() => handleIterate('more urgent')} />
        </div>
      </div>
    </div>
  );
}

function IterateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "text-xs px-3 py-1.5 rounded-lg",
        "bg-neutral-700/50 text-neutral-300",
        "hover:bg-blue-500/20 hover:text-blue-400",
        "transition-all duration-200",
        "flex items-center gap-1.5"
      )}
    >
      <RefreshCw className="w-3 h-3" />
      {label}
    </button>
  );
}

function UIPreviewArtifact({ content, title, onIterate }: { content: string; title?: string; onIterate?: (option: string, action: string) => void }) {
  const [copied, setCopied] = useState(false);
  const text = content.trim();
  const charCount = text.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-sm overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{title || 'UI Preview'}</h4>
            <p className="text-xs text-neutral-400">Live component preview</p>
          </div>
        </div>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full",
          charCount <= 20 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
        )}>
          {charCount} chars
        </span>
      </div>
      
      {/* Preview */}
      <div className="p-8 flex flex-col items-center gap-4 bg-gradient-to-b from-neutral-900/50 to-neutral-800/50">
        <div className="bg-neutral-900 rounded-xl p-8 border border-neutral-700/50 shadow-inner">
          <Button className="min-w-[140px] bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 hover:scale-105">
            {text}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50"
          >
            {copied ? <Check className="mr-1.5 h-3 w-3 text-green-400" /> : <Copy className="mr-1.5 h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy text'}
          </Button>
          {onIterate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIterate(text, 'iterate')}
              className="text-xs text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Iterate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BeforeAfterArtifact({ content, title, onIterate }: { content: string; title?: string; onIterate?: (option: string, action: string) => void }) {
  const [copiedAfter, setCopiedAfter] = useState(false);
  const lines = content.split('\n').filter(l => l.trim());
  const before = lines.find(l => l.toLowerCase().startsWith('before:'))?.replace(/^before:\s*/i, '').trim() || '';
  const after = lines.find(l => l.toLowerCase().startsWith('after:'))?.replace(/^after:\s*/i, '').trim() || '';

  const handleCopyAfter = () => {
    navigator.clipboard.writeText(after);
    setCopiedAfter(true);
    setTimeout(() => setCopiedAfter(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-sm overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{title || 'Before & After'}</h4>
            <p className="text-xs text-neutral-400">See the improvement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
            {before.length} → {after.length} chars
          </span>
        </div>
      </div>
      
      {/* Comparison */}
      <div className="p-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 to-transparent" />
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-red-400">Before</div>
          <div className="text-[15px] text-neutral-300 line-through opacity-70">{before}</div>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/50 to-transparent" />
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-green-400">After</div>
          <div className="text-[15px] font-medium text-neutral-100">{after}</div>
          <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAfter}
              className="text-xs h-7 px-2 text-neutral-400 hover:text-green-400 hover:bg-green-500/10"
            >
              {copiedAfter ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              Copy
            </Button>
            {onIterate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onIterate(after, 'iterate')}
                className="text-xs h-7 px-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Iterate
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyStateArtifact({ content, title, onIterate }: { content: string; title?: string; onIterate?: (option: string, action: string) => void }) {
  const [copied, setCopied] = useState(false);
  const lines = content.split('\n').filter(l => l.trim());
  const icon = lines.find(l => l.toLowerCase().startsWith('icon:'))?.replace(/^icon:\s*/i, '').trim() || '📋';
  const heading = lines.find(l => l.toLowerCase().startsWith('heading:'))?.replace(/^heading:\s*/i, '').trim() || '';
  const body = lines.find(l => l.toLowerCase().startsWith('body:'))?.replace(/^body:\s*/i, '').trim() || '';
  const cta = lines.find(l => l.toLowerCase().startsWith('cta:'))?.replace(/^cta:\s*/i, '').trim() || '';

  const allText = `${heading}\n${body}${cta ? `\n${cta}` : ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl border border-neutral-700/50 bg-neutral-800/80 backdrop-blur-sm overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <span className="text-sm">{icon}</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{title || 'Empty State'}</h4>
            <p className="text-xs text-neutral-400">Preview component</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-neutral-700/50 text-neutral-400">
            {heading.length + body.length} chars
          </span>
        </div>
      </div>
      
      {/* Preview */}
      <div className="p-8 bg-gradient-to-b from-neutral-900/50 to-neutral-800/50">
        <div className="flex flex-col items-center rounded-xl bg-neutral-900/80 border border-neutral-700/50 p-12 text-center">
          <div className="mb-4 text-5xl animate-in zoom-in duration-500">{icon}</div>
          <h3 className="mb-2 text-lg font-semibold text-white">{heading}</h3>
          <p className="mb-6 max-w-sm text-[15px] text-neutral-400">{body}</p>
          {cta && (
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              {cta}
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs text-neutral-400 hover:text-white hover:bg-neutral-700/50"
          >
            {copied ? <Check className="mr-1.5 h-3 w-3 text-green-400" /> : <Copy className="mr-1.5 h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy all text'}
          </Button>
          {onIterate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIterate(allText, 'iterate')}
              className="text-xs text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Iterate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
