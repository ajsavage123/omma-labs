import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import { MessageSquare, X, Send, Circle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { notificationService } from '@/utils/notificationService';
import { projectService } from '@/services/projectService';
import { MOCK_MODE } from '@/lib/mockMode';
import { mockStorage } from '@/utils/mockStorage';

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { toasts, toast, removeToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    fetchMessages();
    projectService.cleanupOldMessages();
    notificationService.requestPermission();

    if (MOCK_MODE || !user) return;

    // 1. Message Subscription
    const subscription = supabase
      .channel('chat_messages_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `workspace_id=eq.${user.workspace_id}`
      }, async (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        
        if (newMsg.user_id !== user?.id) {
          if (!isOpenRef.current) {
            setUnreadCount((prev: number) => prev + 1);
            toast.info(`New message from teammate`);
          }
        }

        let userData = queryCache.get<any>(`user_profile_${newMsg.user_id}`, 3600000);
        if (!userData) {
          const { data } = await supabase
            .from('users')
            .select('username, full_name, designation')
            .eq('id', newMsg.user_id)
            .single();
          userData = data;
          if (data) queryCache.set(`user_profile_${newMsg.user_id}`, data);
        }

        const msgWithUser = { ...newMsg, users: userData };
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, msgWithUser];
        });
      })
      .subscribe();

    // 2. Presence Subscription
    const presenceChannel = supabase.channel(`chat_presence_${user.workspace_id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id, user?.workspace_id, toast]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastMessageIdRef = useRef<string | null>(null);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldScrollRef.current = atBottom;
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
          shouldScrollRef.current = true;
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const lastMessage = messages[messages.length - 1];
    const isMe = lastMessage?.user_id === user?.id;
    const isNewMessage = lastMessage?.id !== lastMessageIdRef.current;
    
    if (isNewMessage) {
        lastMessageIdRef.current = lastMessage?.id;
        const atBottom = shouldScrollRef.current;

        if (isMe || isInitialLoad || atBottom) {
            requestAnimationFrame(() => {
                if (isInitialLoad) {
                    container.scrollTop = container.scrollHeight;
                    setIsInitialLoad(false);
                } else {
                    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                }
                shouldScrollRef.current = true;
            });
        }
    }

    if (lastMessage && !isMe) {
        const timestamp = new Date(lastMessage.created_at).getTime();
        const now = Date.now();
        if (now - timestamp < 3000) {
            notificationService.showNotification(`New message from ${lastMessage.users?.username || 'Team Member'}`, {
                body: lastMessage.message,
                tag: 'chat-notification',
                requireInteraction: false
            });
        }
    }
  }, [messages, user?.id]);

  const fetchMessages = async () => {
    if (MOCK_MODE) {
      setMessages(mockStorage.getMessages());
      return;
    }
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, message, user_id, created_at, users(username, full_name, designation)')
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: true })
      .limit(50);
      
    if (data && !error) {
      setMessages(data as unknown as ChatMessage[]);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    if (MOCK_MODE) {
      const newMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        user_id: user.id,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
        users: {
          username: user.username,
          full_name: user.full_name || user.username,
          designation: user.designation
        }
      };
      mockStorage.addMessage(newMsg);
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        workspace_id: user.workspace_id,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (!isOpen) {
    return (
      <div className="no-print fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 relative"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0A0A0B] animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Pulse dot if someone else is online */}
          {onlineUsers.size > 1 && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#0A0A0B] animate-pulse"></span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="no-print fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-[#121216] rounded-2xl shadow-2xl border border-[#1F1F26] flex flex-col h-[500px] max-h-[80vh] z-[9999] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <h3 className="font-bold flex items-center gap-2">
            Team Chat
            {onlineUsers.size > 1 && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                {onlineUsers.size - 1} Online
              </span>
            )}
          </h3>
          <p className="text-xs text-indigo-100/70">Ooma Workspace Communication</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="relative z-10 p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0A0A0B] custom-scrollbar"
      >
        {messages.map((msg: ChatMessage) => {
          const isMe = msg.user_id === user?.id;
          const isOnline = onlineUsers.has(msg.user_id);
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
              <div className={`flex items-center gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="relative">
                  <div className={`h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500/20 to-[#121216] border border-white/10 flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>
                    {msg.users?.username.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full border border-[#0A0A0B] shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                  )}
                </div>
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight">{msg.users?.username || 'User'}</span>
                    {isOnline && !isMe && <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>}
                  </div>
                </div>
              </div>
              
              <div
                className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-xl transition-all ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/20' 
                    : 'bg-[#1F1F26] text-gray-200 border border-[#2F2F3B] rounded-tl-none shadow-black/40'
                }`}
              >
                <p className="leading-relaxed font-medium">{msg.message}</p>
              </div>
              
              <div className={`flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {!isMe && <span className="text-[8px] font-bold text-indigo-400/50 uppercase tracking-widest">{msg.users?.designation?.split(',')[0]}</span>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#121216] border-t border-white/5">
        <form onSubmit={sendMessage} className="flex gap-2 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Broadcast a message..."
            className="flex-1 pl-4 pr-12 py-3 bg-[#0A0A0B] border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-all disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
}
