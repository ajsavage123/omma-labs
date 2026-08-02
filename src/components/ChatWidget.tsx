import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import { 
  MessageSquare, X, Send, Bell, Pin, Reply, Edit2, 
  Trash2, Smile, Video, Phone 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { notificationService } from '@/utils/notificationService';
import { projectService } from '@/services/projectService';
import { MOCK_MODE } from '@/lib/mockMode';
import { mockStorage } from '@/utils/mockStorage';
import MarkdownRenderer from '@/components/chat/MarkdownRenderer';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉'];

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Advanced features state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [showEmojiForId, setShowEmojiForId] = useState<string | null>(null);

  const { toasts, toast, removeToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const isHistoryLoaded = useRef(false);
  const chatChannelRef = useRef<any>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Global event listener to open chat widget from anywhere (e.g. Dashboard nav link)
  useEffect(() => {
    const handleOpenWidget = () => setIsOpen(true);
    const handleToggleWidget = () => setIsOpen(prev => !prev);

    window.addEventListener('open_chat_widget', handleOpenWidget);
    window.addEventListener('toggle_chat_widget', handleToggleWidget);

    return () => {
      window.removeEventListener('open_chat_widget', handleOpenWidget);
      window.removeEventListener('toggle_chat_widget', handleToggleWidget);
    };
  }, []);

  useEffect(() => {
    fetchMessages();
    projectService.cleanupOldMessages();

    if (MOCK_MODE || !user) return;

    // Helper to process incoming new message (from either Postgres Changes or Broadcast)
    const handleIncomingMessage = async (newMsg: ChatMessage) => {
      let userData = queryCache.get<any>(`user_profile_${newMsg.user_id}`, 3600000);
      if (!userData && newMsg.users) {
        userData = newMsg.users;
      } else if (!userData) {
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

      if (newMsg.user_id !== user?.id) {
        const isClosed = !isOpenRef.current;
        const isHidden = document.visibilityState === 'hidden';
        if (isClosed || isHidden) {
          setUnreadCount((prev: number) => prev + 1);
          // Removed duplicate toast and notificationService calls here, 
          // as GlobalNotificationManager handles it now.
        }
      }
    };

    // 1. Unified Message Channel (Postgres Changes + Realtime Broadcast)
    const chatChannel = supabase.channel(`workspace_chat_${user.workspace_id}`);
    chatChannelRef.current = chatChannel;

    chatChannel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages'
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          handleIncomingMessage(payload.new as ChatMessage);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as ChatMessage : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_reactions'
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => prev.map(m => {
            if (m.id === payload.new.message_id) {
              const reactions = m.reactions || [];
              if (!reactions.find(r => r.id === payload.new.id)) {
                return { ...m, reactions: [...reactions, payload.new] };
              }
            }
            return m;
          }));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.map(m => {
            const reactions = m.reactions || [];
            return { ...m, reactions: reactions.filter(r => r.id !== payload.old.id) };
          }));
        }
      })
      .on('broadcast', { event: 'broadcast_chat_message' }, (payload: any) => {
        if (payload.payload) {
          handleIncomingMessage(payload.payload as ChatMessage);
        }
      })
      .subscribe();

    // 2. Presence Subscription
    const presenceChannel = supabase.channel(`presence_${user.workspace_id}`, {
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
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
      chatChannelRef.current = null;
    };
  }, [user?.id, user?.workspace_id, toast]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open_chat') === 'true') {
        setIsOpen(true);
        const newSearch = window.location.search.replace(/[?&]open_chat=true/, '').replace(/^&/, '?');
        const newUrl = window.location.pathname + (newSearch === '?' || newSearch === '' ? '' : newSearch);
        window.history.replaceState({}, '', newUrl);
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

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

    if (lastMessage && !isMe && isNewMessage && isHistoryLoaded.current) {
      // Removed notification duplication 
    }
  }, [messages, user?.id]);

  const fetchMessages = async () => {
    if (!user) return;
    if (MOCK_MODE) {
      setMessages(mockStorage.getMessages());
      isHistoryLoaded.current = true;
      return;
    }
    
    // Extended query to fetch all advanced features
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        id, message, user_id, created_at, parent_id, is_edited, is_pinned, is_deleted_everyone,
        users!user_id(username, full_name, designation),
        reactions:chat_reactions(*)
      `)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && !error) {
      setMessages(data as unknown as ChatMessage[]);
    }
    isHistoryLoaded.current = true;
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    if (editingMessageId) {
      await handleUpdateMessage(editingMessageId, newMessage.trim());
      return;
    }

    setLoading(true);
    try {
      const msgText = newMessage.trim();
      const parentId = replyingToMessage?.id || null;

      if (MOCK_MODE) {
        const newMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          user_id: user.id,
          message: msgText,
          created_at: new Date().toISOString(),
          parent_id: parentId,
          users: {
            username: user.username,
            full_name: user.full_name || user.username,
            designation: user.designation
          }
        };
        mockStorage.addMessage(newMsg);
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setReplyingToMessage(null);
        return;
      }

      const { data, error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        message: msgText
      }).select('id, created_at').single();

      if (error) throw error;

      // Broadcast over WebSocket Realtime channel for instant zero-latency delivery
      if (chatChannelRef.current) {
        chatChannelRef.current.send({
          type: 'broadcast',
          event: 'broadcast_chat_message',
          payload: {
            id: data?.id || Math.random().toString(36).substring(2, 9),
            user_id: user.id,
            workspace_id: user.workspace_id,
            message: msgText,
            parent_id: parentId,
            created_at: data?.created_at || new Date().toISOString(),
            users: {
              username: user.username,
              full_name: user.full_name || user.username,
              designation: user.designation
            }
          }
        });
      }

      setNewMessage('');
      setReplyingToMessage(null);
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMessage = async (id: string, text: string) => {
    setLoading(true);
    try {
      if (MOCK_MODE) {
        mockStorage.updateMessage(id, text);
        setMessages(prev => prev.map(m => m.id === id ? { ...m, message: text, is_edited: true } : m));
      } else {
        const { error } = await supabase
          .from('chat_messages')
          .update({ message: text })
          .eq('id', id);

        if (error) throw error;
        setMessages(prev => prev.map(m => m.id === id ? { ...m, message: text, is_edited: true } : m));
      }
      setEditingMessageId(null);
      setNewMessage('');
      toast.success('Message updated');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      if (MOCK_MODE) {
        mockStorage.deleteMessage(id);
        setMessages(prev => prev.filter(m => m.id !== id));
      } else {
        // Soft delete implementation
        const { error } = await supabase
          .from('chat_messages')
          .update({ is_deleted_everyone: true })
          .eq('id', id);

        if (error) {
          console.warn('Soft delete failed:', error);
          toast.error('Failed to delete message');
          return;
        }
        
        // Remove permanently from local UI state
        setMessages(prev => prev.map(m => m.id === id ? { ...m, is_deleted_everyone: true } : m));
      }
      toast.info('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handlePinToggle = async (id: string, currentPinStatus: boolean) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: !currentPinStatus } : m));
    toast.success(currentPinStatus ? 'Message unpinned' : 'Message pinned');
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      if (MOCK_MODE) {
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          const existing = reactions.find(r => r.user_id === user.id && r.emoji === emoji);
          if (existing) {
            return { ...m, reactions: reactions.filter(r => r.id !== existing.id) };
          } else {
            return { ...m, reactions: [...reactions, { id: Math.random().toString(), message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }] };
          }
        }));
      } else {
        const { data: existing } = await supabase
          .from('chat_reactions')
          .select('id')
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji)
          .maybeSingle();

        if (existing) {
          await supabase.from('chat_reactions').delete().eq('id', existing.id);
        } else {
          await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
        }
        await fetchMessages();
      }
    } catch {
      // ignore reaction table if not setup
    } finally {
      setShowEmojiForId(null);
    }
  };

  const generateMeetLink = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const generatePhoneLink = () => {
    setNewMessage(prev => (prev ? prev + ' \n' : '') + `📞 **Call me:** [tel:+18005550199](tel:+18005550199)`);
  };

  const pinnedMessagesList = messages.filter(m => m.is_pinned);

  if (!user) return null;

  if (!isOpen) {
    return (
      <div className="no-print fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => {
            setIsOpen(true);
            notificationService.requestPermission();
          }}
          className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-105 relative group"
          title="Open Team Workspace Chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0A0A0B] animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {/* Pulse dot if someone else is online */}
          {onlineUsers.size > 1 && (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-[#0A0A0B] animate-pulse"></span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="no-print fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] bg-[#121216] rounded-2xl shadow-2xl border border-[#1F1F26] flex flex-col h-[560px] max-h-[85vh] z-[9999] overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white flex justify-between items-center relative overflow-hidden border-b border-indigo-500/20">
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
            <MessageSquare className="h-5 w-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              Workspace Chat
              {onlineUsers.size > 1 && (
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                  {onlineUsers.size - 1} Online
                </span>
              )}
            </h3>
            <p className="text-[11px] text-indigo-200/80">Team Collaboration & Messaging</p>
          </div>
        </div>

        <div className="flex items-center gap-1 relative z-10 text-indigo-100">
          <button 
            onClick={generateMeetLink} 
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors" 
            title="Create Instant Google Meet Link"
          >
            <Video className="h-4 w-4" />
          </button>
          <button 
            onClick={generatePhoneLink} 
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors" 
            title="Share Phone Call Link"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setShowPinned(!showPinned)} 
            className={`p-1.5 rounded-lg transition-colors ${showPinned ? 'bg-white/25 text-amber-300 font-bold' : 'hover:bg-white/15'}`} 
            title="Pinned Messages"
          >
            <Pin className="h-4 w-4" />
          </button>
          <button 
            onClick={async () => {
              const granted = await notificationService.requestPermission();
              if (granted) {
                toast.success('Push notifications active!');
                notificationService.showNotification('Notifications Enabled', { body: 'You will receive alerts for new workspace messages.' });
              } else {
                toast.error('Notification permission denied by browser.');
              }
            }}
            title="Enable/Test Push Notifications" 
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pinned Messages Header Drawer */}
      {showPinned && (
        <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-3 text-xs">
          <div className="flex items-center justify-between font-bold text-amber-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" /> Pinned Messages ({pinnedMessagesList.length})
            </span>
            <button onClick={() => setShowPinned(false)} className="text-gray-400 hover:text-white text-[10px]">
              Close
            </button>
          </div>
          {pinnedMessagesList.length === 0 ? (
            <p className="text-gray-500 text-[11px]">No pinned messages yet. Click the pin icon on any message to pin it here.</p>
          ) : (
            <div className="max-h-28 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {pinnedMessagesList.map(p => (
                <div key={p.id} className="bg-[#0A0A0B] p-2 rounded border border-white/5 flex justify-between items-start">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-gray-300 text-[10px]">{p.users?.username}: </span>
                    <span className="text-gray-400 text-[11px] truncate">{p.message}</span>
                  </div>
                  <button onClick={() => handlePinToggle(p.id, true)} className="text-amber-400 hover:text-red-400 shrink-0 text-[10px]" title="Unpin">
                    Unpin
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages List Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0B] custom-scrollbar"
      >
        {messages.map((msg: ChatMessage) => {
          const isMe = msg.user_id === user?.id;
          const isOnline = onlineUsers.has(msg.user_id);
          const parentMsg = msg.parent_id ? messages.find(m => m.id === msg.parent_id) : null;
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
              {/* User Avatar & Name */}
              <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="relative">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500/20 to-[#121216] border border-white/10 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                    {msg.users?.username.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full border border-[#0A0A0B] shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[11px] font-bold text-gray-300">{msg.users?.username || 'User'}</span>
                  {msg.is_pinned && <Pin className="w-3 h-3 text-amber-400" />}
                </div>
              </div>

              {/* Replied Parent Context Preview */}
              {parentMsg && (
                <div className={`flex items-center gap-1.5 text-[11px] text-gray-400 mb-1 max-w-[85%] bg-white/[0.03] border-l-2 border-indigo-500 px-2 py-1 rounded ${isMe ? 'self-end' : 'self-start'}`}>
                  <Reply className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-gray-300 shrink-0">{parentMsg.users?.username}:</span>
                  <span className="truncate">{parentMsg.message.replace(/\n/g, ' ')}</span>
                </div>
              )}
              
              {/* Message Content Bubble */}
              <div
                className={`px-3.5 py-2.5 rounded-2xl max-w-[88%] text-xs shadow-xl transition-all ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-900/20' 
                    : 'bg-[#1F1F26] text-gray-200 border border-[#2F2F3B] rounded-tl-none shadow-black/40'
                }`}
              >
                <div className="leading-relaxed font-medium">
                  {msg.is_deleted_everyone ? (
                    <em className="text-gray-400 italic">This message was deleted</em>
                  ) : (
                    <MarkdownRenderer content={msg.message} />
                  )}
                </div>
              </div>

              {/* Footer Timestamp & Status */}
              <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-gray-500 font-semibold ${isMe ? 'flex-row-reverse' : ''}`}>
                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.is_edited && <span className="text-indigo-400/80">(edited)</span>}
              </div>

              {/* Reactions Bar */}
              {msg.reactions && msg.reactions.length > 0 && !msg.is_deleted_everyone && (
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                    const count = msg.reactions!.filter(r => r.emoji === emoji).length;
                    const hasMyReaction = msg.reactions!.some(r => r.emoji === emoji && r.user_id === user?.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-colors ${
                          hasMyReaction 
                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Hover Actions Menu */}
              {!msg.is_deleted_everyone && (
                <div className={`absolute top-0 ${isMe ? 'left-0' : 'right-0'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-[#1A1A22] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20`}>
                  <button onClick={() => setReplyingToMessage(msg)} className="p-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Reply">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowEmojiForId(showEmojiForId === msg.id ? null : msg.id)} className="p-1 hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors" title="Add Emoji Reaction">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handlePinToggle(msg.id, msg.is_pinned || false)} className="p-1 hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors" title={msg.is_pinned ? "Unpin" : "Pin"}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  
                  {isMe && (
                    <>
                      <div className="w-px h-3 bg-white/10 mx-0.5"></div>
                      <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.message); }} className="p-1 hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Emoji Quick Picker Popover */}
              {showEmojiForId === msg.id && (
                <div className={`absolute top-6 ${isMe ? 'left-0' : 'right-0'} bg-[#1F1F26] border border-white/15 p-1 rounded-lg shadow-2xl flex gap-1 z-30`}>
                  {QUICK_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="p-1 hover:bg-white/10 rounded text-sm transition-transform hover:scale-125">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#121216] border-t border-white/10">
        {/* Reply Context Banner */}
        {replyingToMessage && (
          <div className="mb-2 flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg text-xs text-indigo-300">
            <div className="flex items-center gap-1.5 truncate">
              <Reply className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold shrink-0">Replying to {replyingToMessage.users?.username}:</span>
              <span className="truncate text-indigo-200/80">{replyingToMessage.message}</span>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="p-0.5 hover:bg-white/10 rounded shrink-0 text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Context Banner */}
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg text-xs text-blue-300">
            <div className="flex items-center gap-1.5 truncate">
              <Edit2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">Editing message</span>
            </div>
            <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }} className="p-0.5 hover:bg-white/10 rounded text-red-400 hover:underline">
              Cancel Edit
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
              placeholder={editingMessageId ? "Edit your message..." : "Broadcast a message..."}
              className="w-full pl-3.5 pr-10 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="absolute right-1.5 p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all disabled:opacity-30"
              title="Send Message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex justify-between items-center px-1 text-[9px] text-gray-600 uppercase font-semibold">
            <span>Markdown: **bold**, *italic*, `code`</span>
          </div>
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
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
}
