import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import { MessageSquare, X, Send } from 'lucide-react';
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

    if (MOCK_MODE) return;

    const subscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        
        // Handle unread count and toast
        if (newMsg.user_id !== user?.id) {
          if (!isOpenRef.current) {
            setUnreadCount((prev: number) => prev + 1);
            toast.info(`New message from teammate`);
          }
        }

        // Fetch user data for this message from cache or DB
        let userData = queryCache.get<any>(`user_profile_${newMsg.user_id}`, 3600000); // 1 hour cache
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
          // Double check for duplicates
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, msgWithUser];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, toast]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const shouldScrollRef = useRef(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Keep track of the last processed message ID to prevent unnecessary scrolls
  const lastMessageIdRef = useRef<string | null>(null);

  // Track scroll position to decide if we should auto-scroll later
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // If user is within 100px of bottom, we "pin" the scroll to keep auto-scrolling
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldScrollRef.current = atBottom;
  };

  // Initial snap to bottom when opening
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

  // Handle auto-scroll on new messages
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

        // RULE: Only auto-scroll if:
        // 1. I am the sender
        // 2. OR this is the first time we load (snap to latest)
        // 3. OR the user is already at the bottom and a new message arrives (keep pinned)
        if (isMe || isInitialLoad || atBottom) {
            // Use requestAnimationFrame for the most immediate DOM timing
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

    // Show push notification logic (only for others)
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
        </button>
      </div>
    );
  }

  return (
    <div className="no-print fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-[#121216] rounded-2xl shadow-2xl border border-[#1F1F26] flex flex-col h-[500px] max-h-[80vh] z-[9999]">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white rounded-t-2xl flex justify-between items-center">
        <div>
          <h3 className="font-bold">Team Chat</h3>
          <p className="text-xs text-indigo-100">Live discussion</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white hover:text-indigo-200 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0B]"
      >
        {messages.map((msg: ChatMessage) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-bold text-gray-300">{msg.users?.full_name || msg.users?.username || 'User'}</span>
                {!isMe && <span className="text-[10px] text-gray-500">{msg.users?.designation}</span>}
              </div>
              <div
                className={`px-4 py-2 rounded-2xl max-w-[85%] ${
                  isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#1F1F26] text-gray-200 border border-[#2F2F3B] rounded-tl-none'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
              </div>
              <span className="text-[9px] text-gray-500 mt-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#121216] border-t border-[#1F1F26] rounded-b-2xl">
        <form onSubmit={sendMessage} className="flex gap-2 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 pl-4 pr-10 py-2.5 bg-[#0A0A0B] border border-[#2F2F3B] rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
