import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Trash2, 
  Plus,
  FileJson,
  Github,
  Award,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

const COMPONENT_TYPES = [
  { value: 'button', label: 'Buttons', icon: '🔘' },
  { value: 'error', label: 'Error Messages', icon: '⚠️' },
  { value: 'success', label: 'Success Messages', icon: '✅' },
  { value: 'empty_state', label: 'Empty States', icon: '📭' },
  { value: 'form_label', label: 'Form Labels', icon: '📝' },
  { value: 'tooltip', label: 'Tooltips', icon: '💬' },
  { value: 'navigation', label: 'Navigation', icon: '🧭' },
  { value: 'heading', label: 'Headings', icon: '📰' },
  { value: 'description', label: 'Descriptions', icon: '📄' },
  { value: 'placeholder', label: 'Placeholders', icon: '✏️' },
];

function PatternCard({ pattern, onCopy, onDelete }: { 
  pattern: any; 
  onCopy: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pattern.text);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={cn(
        "group bg-neutral-800/50 rounded-xl border border-neutral-700/50",
        "hover:border-neutral-600 transition-all duration-200",
        "overflow-hidden"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-base leading-relaxed">
              "{pattern.text}"
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300">
                {pattern.text.length} chars
              </span>
              {pattern.abTestWinner && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  A/B Winner
                </span>
              )}
              {pattern.userResearchValidated && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  UXR Validated
                </span>
              )}
              {pattern.conversionLift && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{pattern.conversionLift}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {pattern.context && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Context
          </button>
        )}
      </div>
      
      {expanded && pattern.context && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-neutral-400 bg-neutral-900/50 rounded-lg p-3">
            {pattern.context}
          </p>
        </div>
      )}
      
      <div className="px-4 py-2 bg-neutral-900/30 border-t border-neutral-700/30 flex items-center justify-between text-xs text-neutral-500">
        <span>Used {pattern.usageCount || 0} times</span>
        <span>{pattern.source === 'imported' ? 'Imported' : pattern.source === 'accepted_suggestion' ? 'From AI' : 'Manual'}</span>
      </div>
    </div>
  );
}

function AddPatternModal({ isOpen, onClose, onAdd }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [text, setText] = useState('');
  const [componentType, setComponentType] = useState('button');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    await onAdd({ text: text.trim(), componentType, context: context.trim() || undefined });
    setIsSubmitting(false);
    setText('');
    setContext('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white">Add Pattern</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Copy Text</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the copy text..."
              className="bg-neutral-900 border-neutral-700 text-white"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Component Type</label>
            <select
              value={componentType}
              onChange={(e) => setComponentType(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMPONENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Context (optional)</label>
            <Input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Where/when is this copy used?"
              className="bg-neutral-900 border-neutral-700 text-white"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-neutral-600">
              Cancel
            </Button>
            <Button type="submit" disabled={!text.trim() || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Pattern'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GitHubModal({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Github className="w-5 h-5 text-purple-400" />
            Connect GitHub Repository
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
        
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-neutral-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Github className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Coming Soon</h3>
          <p className="text-neutral-400 text-sm mb-6">
            Connect your GitHub repository to automatically extract UI strings from your codebase. 
            We'll scan for patterns in React components, i18n files, and more.
          </p>
          <div className="bg-neutral-900/50 rounded-lg p-4 text-left text-sm">
            <p className="text-neutral-300 font-medium mb-2">What we'll extract:</p>
            <ul className="text-neutral-400 space-y-1">
              <li>• Button labels and CTAs</li>
              <li>• Error and success messages</li>
              <li>• Form labels and placeholders</li>
              <li>• Navigation items</li>
              <li>• i18n/localization strings</li>
            </ul>
          </div>
          <Button onClick={onClose} className="mt-6">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ isOpen, onClose, onImport }: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (patterns: any[]) => void;
}) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const parsed = JSON.parse(jsonInput);
      const patterns = Array.isArray(parsed) ? parsed : [parsed];
      
      // Validate patterns
      for (const p of patterns) {
        if (!p.text || typeof p.text !== 'string') {
          throw new Error('Each pattern must have a "text" field');
        }
        if (!p.componentType) {
          throw new Error('Each pattern must have a "componentType" field');
        }
      }
      
      setIsSubmitting(true);
      await onImport(patterns);
      setIsSubmitting(false);
      setJsonInput('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid JSON');
    }
  };

  const exampleJson = `[
  {
    "text": "Save changes",
    "componentType": "button",
    "context": "Settings page"
  },
  {
    "text": "Something went wrong",
    "componentType": "error",
    "context": "Generic error"
  }
]`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileJson className="w-5 h-5 text-blue-400" />
            Import Patterns (JSON)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Paste JSON array of patterns
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={exampleJson}
              rows={12}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className="text-xs text-neutral-500">
            <p className="font-medium mb-1">Required fields:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="text-neutral-400">text</code> - The copy text</li>
              <li><code className="text-neutral-400">componentType</code> - button, error, success, empty_state, form_label, tooltip, navigation, heading, description, placeholder</li>
            </ul>
            <p className="font-medium mt-2 mb-1">Optional fields:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="text-neutral-400">context</code> - Where/when this copy is used</li>
              <li><code className="text-neutral-400">abTestWinner</code> - true/false</li>
              <li><code className="text-neutral-400">userResearchValidated</code> - true/false</li>
              <li><code className="text-neutral-400">conversionLift</code> - percentage as string (e.g., "12.5")</li>
            </ul>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-neutral-600">
              Cancel
            </Button>
            <Button type="submit" disabled={!jsonInput.trim() || isSubmitting}>
              {isSubmitting ? 'Importing...' : 'Import Patterns'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatternLibrary() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'button' | 'error' | 'success' | 'empty_state' | 'form_label' | 'tooltip' | 'navigation' | 'heading' | 'description' | 'placeholder' | 'modal_title' | 'modal_body' | 'notification' | 'onboarding' | 'cta' | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);

  const { data: patterns, isLoading, refetch } = trpc.patterns.list.useQuery(
    { limit: 100, offset: 0, componentType: selectedType || undefined },
    { enabled: !!user }
  );

  const createPattern = trpc.patterns.create.useMutation({
    onSuccess: () => refetch(),
  });

  const deletePattern = trpc.patterns.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const importPatterns = trpc.patterns.import.useMutation({
    onSuccess: () => refetch(),
  });

  const filteredPatterns = useMemo(() => {
    if (!patterns) return [];
    if (!searchQuery.trim()) return patterns;
    
    const query = searchQuery.toLowerCase();
    return patterns.filter((p: any) => 
      p.text.toLowerCase().includes(query) ||
      p.context?.toLowerCase().includes(query)
    );
  }, [patterns, searchQuery]);

  const groupedPatterns = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const pattern of filteredPatterns) {
      const type = pattern.componentType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(pattern);
    }
    return groups;
  }, [filteredPatterns]);

  const stats = useMemo(() => {
    if (!patterns) return { total: 0, abWinners: 0, uxrValidated: 0 };
    return {
      total: patterns.length,
      abWinners: patterns.filter((p: any) => p.abTestWinner).length,
      uxrValidated: patterns.filter((p: any) => p.userResearchValidated).length,
    };
  }, [patterns]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to access Pattern Library</h1>
          <p className="text-neutral-400">Your product's copy patterns will be stored here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Pattern Library</h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                {stats.total} patterns • {stats.abWinners} A/B winners • {stats.uxrValidated} UXR validated
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(true)}
                className="border-neutral-700 text-neutral-300 hover:text-white"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Import JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGitHubModal(true)}
                className="border-neutral-700 text-neutral-300 hover:text-white"
              >
                <Github className="w-4 h-4 mr-2" />
                Connect GitHub
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pattern
              </Button>
            </div>
          </div>
          
          {/* Search and filters */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patterns..."
                className="pl-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedType(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors",
                  !selectedType 
                    ? "bg-blue-500 text-white" 
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                )}
              >
                All
              </button>
              {COMPONENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5",
                    selectedType === type.value 
                      ? "bg-blue-500 text-white" 
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  )}
                >
                  <span>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-white mb-2">No patterns yet</h2>
            <p className="text-neutral-400 mb-6">
              Start building your pattern library by adding copy that works.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Pattern
            </Button>
          </div>
        ) : selectedType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatterns.map((pattern: any) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onCopy={() => {}}
                onDelete={() => deletePattern.mutate({ id: pattern.id })}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedPatterns).map(([type, typePatterns]) => {
              const typeInfo = COMPONENT_TYPES.find((t) => t.value === type);
              return (
                <section key={type}>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>{typeInfo?.icon || '📝'}</span>
                    {typeInfo?.label || type}
                    <span className="text-sm font-normal text-neutral-500">
                      ({typePatterns.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typePatterns.map((pattern: any) => (
                      <PatternCard
                        key={pattern.id}
                        pattern={pattern}
                        onCopy={() => {}}
                        onDelete={() => deletePattern.mutate({ id: pattern.id })}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddPatternModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => createPattern.mutate(data)}
      />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(patterns) => importPatterns.mutate({ patterns })}
      />
      <GitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
      />
    </div>
  );
}
