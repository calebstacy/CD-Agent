import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ImagePlus, X, Paperclip, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Streamdown } from 'streamdown';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: Date;
}

export default function Chat() {
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
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  // Import slash commands
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
        toast.error('Please upload only image files');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setUploadedImages(prev => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setUploadedImages(prev => [...prev, dataUrl]);
            toast.success('Image pasted');
          };
          reader.readAsDataURL(file);
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
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: result.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to generate response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "Sorry, I ran into an issue. Could you try that again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-neutral-900 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Content Design Partner</h1>
                <p className="text-sm text-neutral-500 mt-0.5">Online · Ready to help</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-neutral-50/30">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="space-y-12">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-6 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-in fade-in slide-in-from-bottom-4 duration-500`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                )}
                
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div
                    className={`${
                      message.role === 'user'
                        ? 'bg-neutral-900 text-white rounded-3xl rounded-tr-lg px-6 py-4 shadow-sm'
                        : 'text-neutral-800'
                    }`}
                  >
                    {message.images && message.images.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        {message.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Uploaded ${idx + 1}`}
                            className="max-w-sm rounded-2xl border border-white/10 shadow-lg"
                          />
                        ))}
                      </div>
                    )}
                    
                    {message.role === 'assistant' ? (
                      <div className="prose prose-neutral prose-base max-w-none leading-relaxed">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-[15.5px] leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  
                  {message.timestamp && (
                    <span className={`text-xs text-neutral-400 ${message.role === 'user' ? 'text-right' : 'text-left'} px-1`}>
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-neutral-600">You</span>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-3 text-neutral-500 text-sm mt-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                    <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                    <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
                  </div>
                  <span className="font-medium">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-8 py-6">
          {/* Image previews */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {uploadedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border-2 border-neutral-200 shadow-sm"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Slash commands dropdown */}
          {showSlashCommands && filteredCommands.length > 0 && (
            <div 
              ref={commandsRef}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border-2 border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.command}
                    onClick={() => selectCommand(cmd)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-neutral-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Command className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-neutral-900">{cmd.command}</span>
                          <span className="text-sm text-neutral-600">{cmd.label}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{cmd.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
                <p className="text-xs text-neutral-500 font-mono">↑↓ navigate · ⏎ select · esc close</p>
              </div>
            </div>
          )}

          <div className="relative bg-neutral-50 rounded-2xl border-2 border-neutral-200 focus-within:border-neutral-400 focus-within:bg-white transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Describe what you're working on, or paste an image..."
              className="min-h-[56px] max-h-[200px] px-5 py-4 pr-28 resize-none border-0 bg-transparent focus:ring-0 text-[15.5px] leading-relaxed placeholder:text-neutral-400"
              disabled={isGenerating}
              rows={1}
            />
            
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
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
                className="w-9 h-9 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                <Paperclip className="w-4 h-4 text-neutral-600" strokeWidth={2} />
              </Button>
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && uploadedImages.length === 0) || isGenerating}
                size="icon"
                className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 shadow-sm hover:shadow-md transition-all"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-neutral-500 mt-3 font-mono tracking-tight">
            <kbd className="px-2 py-1 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-[11px] font-medium">⏎</kbd> send
            {' · '}
            <kbd className="px-2 py-1 rounded-md bg-neutral-100 border border-neutral-200 font-mono text-[11px] font-medium">⇧⏎</kbd> new line
            {' · '}
            Paste images directly
          </p>
        </div>
      </div>
    </div>
  );
}
