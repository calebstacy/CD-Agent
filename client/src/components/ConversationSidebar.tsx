import { useState } from 'react';
import { MessageSquare, Plus, Search, MoreHorizontal, Trash2, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface ConversationSidebarProps {
  currentConversationId?: number;
  onSelectConversation: (id: number | undefined) => void;
  onNewConversation: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  
  // Fetch conversations
  const { data: conversations, isLoading, refetch } = trpc.chat.list.useQuery(undefined, {
    enabled: !!user,
  });
  
  // Archive mutation
  const archiveMutation = trpc.chat.archive.useMutation({
    onSuccess: () => {
      refetch();
      if (currentConversationId) {
        onSelectConversation(undefined);
      }
    },
  });

  // Filter conversations by search
  const filteredConversations = conversations?.filter(conv => 
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group conversations by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedConversations = {
    today: filteredConversations.filter(c => {
      const date = new Date(c.createdAt);
      return date.toDateString() === today.toDateString();
    }),
    yesterday: filteredConversations.filter(c => {
      const date = new Date(c.createdAt);
      return date.toDateString() === yesterday.toDateString();
    }),
    lastWeek: filteredConversations.filter(c => {
      const date = new Date(c.createdAt);
      return date > lastWeek && date.toDateString() !== today.toDateString() && date.toDateString() !== yesterday.toDateString();
    }),
    older: filteredConversations.filter(c => {
      const date = new Date(c.createdAt);
      return date <= lastWeek;
    }),
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-8 h-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="w-8 h-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-neutral-500" />
        </div>
        <span className="text-xs text-neutral-500 -rotate-90 whitespace-nowrap mt-4">
          {filteredConversations.length} chats
        </span>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-neutral-900 border-r border-neutral-800 flex flex-col animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Conversations</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500/50 h-9 text-sm"
          />
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {!user ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 mb-1">Sign in to save chats</p>
            <p className="text-xs text-neutral-500">Your conversation history will appear here</p>
          </div>
        ) : isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-neutral-400">Loading...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-400 mb-1">No conversations yet</p>
            <p className="text-xs text-neutral-500">Start a new chat to begin</p>
          </div>
        ) : (
          <>
            {groupedConversations.today.length > 0 && (
              <ConversationGroup
                label="Today"
                conversations={groupedConversations.today}
                currentId={currentConversationId}
                hoveredId={hoveredId}
                onSelect={onSelectConversation}
                onHover={setHoveredId}
                onArchive={(id) => archiveMutation.mutate({ conversationId: id })}
              />
            )}
            {groupedConversations.yesterday.length > 0 && (
              <ConversationGroup
                label="Yesterday"
                conversations={groupedConversations.yesterday}
                currentId={currentConversationId}
                hoveredId={hoveredId}
                onSelect={onSelectConversation}
                onHover={setHoveredId}
                onArchive={(id) => archiveMutation.mutate({ conversationId: id })}
              />
            )}
            {groupedConversations.lastWeek.length > 0 && (
              <ConversationGroup
                label="Last 7 days"
                conversations={groupedConversations.lastWeek}
                currentId={currentConversationId}
                hoveredId={hoveredId}
                onSelect={onSelectConversation}
                onHover={setHoveredId}
                onArchive={(id) => archiveMutation.mutate({ conversationId: id })}
              />
            )}
            {groupedConversations.older.length > 0 && (
              <ConversationGroup
                label="Older"
                conversations={groupedConversations.older}
                currentId={currentConversationId}
                hoveredId={hoveredId}
                onSelect={onSelectConversation}
                onHover={setHoveredId}
                onArchive={(id) => archiveMutation.mutate({ conversationId: id })}
              />
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{filteredConversations.length} conversations</span>
          {user && (
            <span className="text-neutral-600">Signed in as {user.name?.split(' ')[0]}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConversationGroupProps {
  label: string;
  conversations: Array<{ id: number; title: string | null; createdAt: Date }>;
  currentId?: number;
  hoveredId: number | null;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
  onArchive: (id: number) => void;
}

function ConversationGroup({ 
  label, 
  conversations, 
  currentId, 
  hoveredId,
  onSelect, 
  onHover,
  onArchive 
}: ConversationGroupProps) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-0.5 px-2">
        {conversations.map((conv, index) => (
          <div
            key={conv.id}
            className={cn(
              "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
              "animate-in fade-in slide-in-from-left-2",
              currentId === conv.id 
                ? "bg-blue-500/20 text-white" 
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onSelect(conv.id)}
            onMouseEnter={() => onHover(conv.id)}
            onMouseLeave={() => onHover(null)}
          >
            <MessageSquare className={cn(
              "w-4 h-4 flex-shrink-0",
              currentId === conv.id ? "text-blue-400" : "text-neutral-500"
            )} />
            <span className="flex-1 truncate text-sm">
              {conv.title || 'New conversation'}
            </span>
            {hoveredId === conv.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(conv.id);
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <Archive className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
