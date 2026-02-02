import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Paperclip, Command, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Streamdown } from 'streamdown';
import { parseArtifacts } from '@/lib/parseArtifacts';
import { ArtifactRenderer } from '@/components/ArtifactRenderer';
import { ThinkingSteps } from '@/components/ThinkingSteps';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: Date;
  thinking?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant' as const,
      content: "Hey there. I'm here to help you think through content design challenges. What are you working on?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  // Fetch conversation if we have an ID
  const { data: conversationData, refetch: refetchConversation } = trpc.chat.get.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId && !!user }
  );

  // Load conversation messages when data changes
  useEffect(() => {
    if (conversationData?.messages && conversationData.messages.length > 0) {
      const loadedMessages: ChatMessage[] = conversationData.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        images: msg.images?.map((img: any) => img.url),
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loadedMessages);
    }
  }, [conversationData]);

  // Slash commands
  const slashCommands = [
    { command: '/iterate', label: 'Iterate on copy', description: 'Refine and improve existing copy', prompt: "I'd like to iterate on some copy I've written. Can you help me think through different variations and improvements?" },
    { command: '/brainstorm', label: 'Brainstorm ideas', description: 'Generate multiple creative options', prompt: "Let's brainstorm together. I need help generating multiple creative options for this content challenge." },
    { command: '/review', label: 'Review my copy', description: 'Get feedback on existing content', prompt: "I'd like you to review some copy I've written and give me thoughtful feedback on what's working and what could be stronger." },
    { command: '/shorten', label: 'Make it shorter', description: 'Condense without losing meaning', prompt: "I need to make this copy shorter while keeping the core message. Can you help me find the most concise way to say this?" },
    { command: '/clarify', label: 'Make it clearer', description: 'Improve clarity and understanding', prompt: "This copy feels unclear or confusing. Can you help me make it more straightforward and easier to understand?" },
    { command: '/tone', label: 'Adjust tone', description: 'Change the voice or feeling', prompt: "I want to adjust the tone of this copy. Let's talk through different ways to say this with a different voice or feeling." },
    { command: '/error', label: 'Error message help', description: 'Write empathetic error copy', prompt: "I'm working on an error message. Help me think through how to communicate this problem in a way that's helpful and not frustrating." },
    { command: '/cta', label: 'Call-to-action', description: 'Write compelling CTAs', prompt: "I need help with a call-to-action. Let's explore different ways to motivate users to take this action." },
    { command: '/onboarding', label: 'Onboarding copy', description: 'Welcome and guide new users', prompt: "I'm designing an onboarding flow. Help me think through how to welcome users and guide them through their first experience." },
    { command: '/empty', label: 'Empty state', description: 'Fill blank spaces meaningfully', prompt: "I'm working on an empty state—when there's no content yet. How can I make this moment helpful instead of just blank?" },
    { command: '/microcopy', label: 'Microcopy help', description: 'Small but important text', prompt: "I need help with some microcopy—those small bits of text like button labels, tooltips, or form hints. Let's make them work harder." },
    { command: '/accessibility', label: 'Accessibility check', description: 'Make content more inclusive', prompt: "Can you help me review this copy for accessibility? I want to make sure it's clear and inclusive for all users." }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Handle slash command detection
  useEffect(() => {
    if (input.startsWith('/')) {
      const query = input.slice(1).toLowerCase();
      const filtered = slashCommands.filter(cmd => 
        cmd.command.slice(1).toLowerCase().includes(query) ||
        cmd.label.toLowerCase().includes(query)
      );
      setFilteredCommands(filtered);
      setShowSlashCommands(filtered.length > 0);
    } else {
      setShowSlashCommands(false);
    }
  }, [input]);

  // Click outside to close commands
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandsRef.current && !commandsRef.current.contains(event.target as Node)) {
        setShowSlashCommands(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chatMutation = trpc.chat.send.useMutation();

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload image files only');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleImageUpload([file] as unknown as FileList);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedImages.length === 0) || isGenerating) return;

    const userMessage = input.trim();
    const images = [...uploadedImages];
    
    setInput('');
    setUploadedImages([]);
    setLastUserMessage(userMessage);
    setMessages(prev => [...prev, { 
      role: 'user' as const, 
      content: userMessage || '(Image attached)',
      images,
      timestamp: new Date()
    }]);
    setIsGenerating(true);

    try {
      const result = await chatMutation.mutateAsync({
        message: userMessage || 'Please analyze this image',
        conversationId: conversationId,
        images: images.length > 0 ? images.map(url => ({ url })) : undefined,
      });
      
      // Update conversation ID if this was the first message
      if (!conversationId && result.conversationId) {
        setConversationId(result.conversationId);
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: result.response,
        thinking: result.thinking,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error('Failed to generate response:', error);
      toast.error(error.message || 'Failed to generate response');
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "Sorry, I ran into an issue. Could you try that again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle iteration from artifact
  const handleIterate = (option: string, action: string) => {
    const iterationPrompt = `I'd like to iterate on this copy: "${option}"\n\nCan you make it ${action}?`;
    setInput(iterationPrompt);
    textareaRef.current?.focus();
    toast.success(`Ready to iterate: ${action}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashCommands) {
      if (e.key === 'Escape') {
        setShowSlashCommands(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectCommand = (cmd: any) => {
    setInput(cmd.prompt);
    setShowSlashCommands(false);
    textareaRef.current?.focus();
  };

  const handleSelectConversation = (id: number | undefined) => {
    setConversationId(id);
    if (!id) {
      // Reset to new conversation
      setMessages([{
        role: 'assistant' as const,
        content: "Hey there. I'm here to help you think through content design challenges. What are you working on?",
        timestamp: new Date()
      }]);
    }
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setMessages([{
      role: 'assistant' as const,
      content: "Hey there. I'm here to help you think through content design challenges. What are you working on?",
      timestamp: new Date()
    }]);
    setSidebarCollapsed(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-neutral-900">
      {/* Sidebar */}
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="lg:hidden h-9 w-9 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
                    <Sparkles className="w-5 h-5 text-blue-400" strokeWidth={2} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-neutral-900 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-base font-semibold text-white tracking-tight">Content Design Partner</h1>
                  <p className="text-xs text-neutral-400">Online · Ready to help</p>
                </div>
              </div>
              {user && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-neutral-400">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span>{user.name?.split(' ')[0]}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="space-y-8">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                    "animate-in fade-in slide-in-from-bottom-2 duration-300"
                  )}
                  style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1 border border-blue-500/10">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1.5 max-w-2xl min-w-0">
                    <div
                      className={cn(
                        message.role === 'user'
                          ? 'bg-neutral-800 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg shadow-black/20'
                          : 'text-neutral-200'
                      )}
                    >
                      {message.images && message.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {message.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Uploaded ${idx + 1}`}
                              className="max-w-xs rounded-xl border border-white/10 shadow-lg"
                            />
                          ))}
                        </div>
                      )}
                      
                      {message.role === 'assistant' ? (
                        <>
                          {message.thinking && (
                            <details className="mb-4 text-sm">
                              <summary className="cursor-pointer text-neutral-500 hover:text-neutral-400 font-medium mb-2 transition-colors">
                                💭 Thinking process
                              </summary>
                              <div className="mt-2 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50 text-neutral-400 leading-relaxed whitespace-pre-wrap text-sm">
                                {message.thinking}
                              </div>
                            </details>
                          )}
                          <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                            {parseArtifacts(message.content).map((block, idx) => (
                              block.type === 'artifact' && block.artifact ? (
                                <ArtifactRenderer
                                  key={idx}
                                  type={block.artifact.type}
                                  content={block.artifact.content}
                                  title={block.artifact.title}
                                  onIterate={handleIterate}
                                />
                              ) : (
                                <Streamdown key={idx}>{block.content}</Streamdown>
                              )
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-[15px] leading-relaxed">{message.content}</p>
                      )}
                    </div>
                    
                    {message.timestamp && (
                      <span className={cn(
                        "text-[10px] text-neutral-500",
                        message.role === 'user' ? 'text-right' : 'text-left',
                        "px-1"
                      )}>
                        {formatTime(message.timestamp)}
                      </span>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-[10px] font-semibold text-neutral-300">You</span>
                    </div>
                  )}
                </div>
              ))}

              <ThinkingSteps isGenerating={isGenerating} userMessage={lastUserMessage} />

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4">
            {/* Image previews */}
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative group animate-in zoom-in duration-200">
                    <img
                      src={img}
                      alt={`Upload ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-neutral-700 shadow-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Slash commands dropdown */}
            {showSlashCommands && filteredCommands.length > 0 && (
              <div 
                ref={commandsRef}
                className="absolute bottom-full left-0 right-0 mb-2 bg-neutral-800 rounded-xl border border-neutral-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto">
                  {filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.command}
                      onClick={() => selectCommand(cmd)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-700/70 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          <Command className="w-3.5 h-3.5 text-blue-400" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-white">{cmd.command}</span>
                            <span className="text-sm text-neutral-300">{cmd.label}</span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">{cmd.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 bg-neutral-900/50 border-t border-neutral-700/50">
                  <p className="text-[10px] text-neutral-500 font-mono">↑↓ navigate · ⏎ select · esc close</p>
                </div>
              </div>
            )}

            <div className="relative bg-neutral-800/80 rounded-xl border border-neutral-700/50 focus-within:border-blue-500/30 focus-within:shadow-lg focus-within:shadow-blue-500/5 transition-all duration-200">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Describe what you're working on, or paste an image..."
                className="min-h-[48px] max-h-[160px] px-4 py-3 pr-24 resize-none border-0 bg-transparent focus:ring-0 focus-visible:ring-0 text-[15px] leading-relaxed text-white placeholder:text-neutral-500"
                disabled={isGenerating}
                rows={1}
              />
              
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 rounded-lg hover:bg-neutral-700/70 transition-colors"
                >
                  <Paperclip className="w-4 h-4 text-neutral-400" strokeWidth={2} />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={(!input.trim() && uploadedImages.length === 0) || isGenerating}
                  size="icon"
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all duration-200",
                    "bg-blue-600 hover:bg-blue-500 disabled:opacity-30",
                    "shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                  )}
                >
                  <Send className="w-4 h-4 text-white" strokeWidth={2} />
                </Button>
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-600 mt-2 font-mono tracking-tight">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[9px]">⏎</kbd> send
              {' · '}
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[9px]">⇧⏎</kbd> new line
              {' · '}
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[9px]">/</kbd> commands
              {' · '}
              Paste images directly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
