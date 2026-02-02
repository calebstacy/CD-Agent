import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ImagePlus, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { Streamdown } from 'streamdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey there. I'm here to help you think through content design challenges. What are you working on?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      role: 'user', 
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
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to generate response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I ran into an issue. Could you try that again?",
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
