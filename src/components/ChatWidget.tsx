import { useState, useEffect, useRef, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types';

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (!isOpen && newMsg.user_id !== user?.id) {
          setUnreadCount(prev => prev + 1);
        }
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, users(username, full_name, designation)')
      .order('created_at', { ascending: true })
      .limit(100);
      
    if (data && !error) {
      setMessages(data as unknown as ChatMessage[]);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

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
      <div className="fixed bottom-6 right-6 z-50">
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
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 bg-[#121216] rounded-2xl shadow-2xl border border-[#1F1F26] flex flex-col h-[500px] max-h-[80vh] z-50">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0B]">
        {messages.map((msg) => {
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
            onChange={(e) => setNewMessage(e.target.value)}
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
    </div>
  );
}
