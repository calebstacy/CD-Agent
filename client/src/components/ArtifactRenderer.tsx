import { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ArtifactProps {
  type: 'copy-options' | 'ui-preview' | 'before-after' | 'empty-state';
  content: string;
  title?: string;
}

export function ArtifactRenderer({ type, content, title }: ArtifactProps) {
  switch (type) {
    case 'copy-options':
      return <CopyOptionsArtifact content={content} title={title} />;
    case 'ui-preview':
      return <UIPreviewArtifact content={content} title={title} />;
    case 'before-after':
      return <BeforeAfterArtifact content={content} title={title} />;
    case 'empty-state':
      return <EmptyStateArtifact content={content} title={title} />;
    default:
      return null;
  }
}

function CopyOptionsArtifact({ content, title }: { content: string; title?: string }) {
  const options = content.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.replace(/^-\s*/, '').trim());
  
  return (
    <div className="my-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {title && <h4 className="mb-4 text-sm font-medium text-neutral-900">{title}</h4>}
      <div className="space-y-3">
        {options.map((option, idx) => (
          <CopyOption key={idx} text={option} index={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function CopyOption({ text, index }: { text: string; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 transition-all hover:border-neutral-300 hover:bg-neutral-100">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
          {index}
        </span>
        <span className="text-[15.5px] text-neutral-900">{text}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function UIPreviewArtifact({ content, title }: { content: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {title && <h4 className="mb-4 text-sm font-medium text-neutral-900">{title}</h4>}
      <div className="flex flex-col items-center gap-4 rounded-lg bg-neutral-50 p-8">
        <Button className="min-w-[140px]">{content.trim()}</Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-xs"
        >
          {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy text'}
        </Button>
      </div>
    </div>
  );
}

function BeforeAfterArtifact({ content, title }: { content: string; title?: string }) {
  const lines = content.split('\n').filter(l => l.trim());
  const before = lines.find(l => l.toLowerCase().startsWith('before:'))?.replace(/^before:\s*/i, '').trim() || '';
  const after = lines.find(l => l.toLowerCase().startsWith('after:'))?.replace(/^after:\s*/i, '').trim() || '';

  return (
    <div className="my-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {title && <h4 className="mb-4 text-sm font-medium text-neutral-900">{title}</h4>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-red-700">Before</div>
          <div className="text-[15.5px] text-neutral-900 line-through opacity-70">{before}</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-green-700">After</div>
          <div className="text-[15.5px] font-medium text-neutral-900">{after}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyStateArtifact({ content, title }: { content: string; title?: string }) {
  const lines = content.split('\n').filter(l => l.trim());
  const icon = lines.find(l => l.toLowerCase().startsWith('icon:'))?.replace(/^icon:\s*/i, '').trim() || '📋';
  const heading = lines.find(l => l.toLowerCase().startsWith('heading:'))?.replace(/^heading:\s*/i, '').trim() || '';
  const body = lines.find(l => l.toLowerCase().startsWith('body:'))?.replace(/^body:\s*/i, '').trim() || '';
  const cta = lines.find(l => l.toLowerCase().startsWith('cta:'))?.replace(/^cta:\s*/i, '').trim() || '';

  return (
    <div className="my-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {title && <h4 className="mb-4 text-sm font-medium text-neutral-900">{title}</h4>}
      <div className="flex flex-col items-center rounded-lg bg-neutral-50 p-12 text-center">
        <div className="mb-4 text-5xl">{icon}</div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-900">{heading}</h3>
        <p className="mb-6 max-w-sm text-[15.5px] text-neutral-600">{body}</p>
        {cta && <Button>{cta}</Button>}
      </div>
    </div>
  );
}
