import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { queryCache } from '@/utils/cache';
import { 
  MessageSquare, X, Send, Pin, Reply, Edit2, 
  Trash2, Video 
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
  // Long-press context menu (WhatsApp / Telegram style)
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage, x: number, y: number } | null>(null);

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
        table: 'chat_messages',
        // FIX #3: Filter to current workspace only
        filter: `workspace_id=eq.${user.workspace_id}`
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
      .eq('workspace_id', user.workspace_id)
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
          },
          workspace_id: user.workspace_id
        };
        mockStorage.addMessage(newMsg);
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setReplyingToMessage(null);
        return;
      }

      const msgId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });
      
      const newMsg: ChatMessage = {
        id: msgId,
        user_id: user.id,
        workspace_id: user.workspace_id!,
        message: msgText,
        parent_id: parentId,
        created_at: new Date().toISOString(),
        users: {
          username: user.username,
          full_name: user.full_name || user.username,
          designation: user.designation
        }
      };

      // Optimistic Update - instant UI response
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setNewMessage('');
      setReplyingToMessage(null);
      setLoading(false); // Stop loading immediately

      // Fire DB insert in background
      supabase.from('chat_messages').insert({
        id: msgId,
        user_id: user.id,
        workspace_id: user.workspace_id,
        message: msgText,
        parent_id: parentId
      }).then(({ error }) => {
        if (error) {
          console.error('Error inserting message:', error);
          toast.error('Failed to send message');
          // Rollback if failed
          setMessages(prev => prev.filter(m => m.id !== msgId));
        } else {
          // Broadcast over WebSocket Realtime channel for instant zero-latency delivery to peers
          if (chatChannelRef.current) {
            chatChannelRef.current.send({
              type: 'broadcast',
              event: 'broadcast_chat_message',
              payload: newMsg
            });
          }
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
        // FIX #4: Persist is_edited flag to DB so it survives refresh
        const { error } = await supabase
          .from('chat_messages')
          .update({ message: text, is_edited: true })
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
          .update({ is_deleted_everyone: true, message: '' })
          .eq('id', id);

        if (error) {
          console.warn('Soft delete failed:', error);
          toast.error('Failed to delete message');
          return;
        }
        
        // Remove permanently from local UI state
        setMessages(prev => prev.map(m => m.id === id ? { ...m, is_deleted_everyone: true, message: '' } : m));
      }
      toast.info('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handlePinToggle = async (id: string, currentPinStatus: boolean) => {
    // Optimistic UI update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: !currentPinStatus } : m));
    // FIX #2: Persist pin state to DB so it survives refresh
    if (!MOCK_MODE) {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: !currentPinStatus })
        .eq('id', id);
      if (error) {
        // Rollback UI on failure
        setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: currentPinStatus } : m));
        toast.error('Failed to pin message');
        return;
      }
    }
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
        // FIX #6: Removed redundant fetchMessages() — realtime chat_reactions subscription handles update
      }
    } catch {
      // ignore reaction table if not setup
    }
  };

  const generateMeetLink = () => {
    window.open('https://meet.google.com/new', '_blank');
  };


  const pinnedMessagesList = messages.filter(m => m.is_pinned);

  if (!user) return null;

  if (!isOpen) {
    return createPortal(
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
          {onlineUsers.size > 1 && (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-[#0A0A0B] animate-pulse"></span>
          )}
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100%-32px)] sm:w-[390px] bg-[#0B0B0F] rounded-2xl shadow-2xl flex flex-col h-[75vh] sm:h-[600px] max-h-[600px] z-[9999] overflow-hidden border border-white/[0.06]">

      {/* ── TOP HEADER (WhatsApp / Telegram style) ── */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 bg-[#161620] border-b border-white/[0.06]">
        {/* Close on mobile, acts like back */}
        <button onClick={() => setIsOpen(false)} className="sm:hidden p-1.5 -ml-1 text-gray-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        {/* Avatar with online ring */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
            WC
          </div>
          {onlineUsers.size > 1 && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#161620]" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-white leading-tight">Workspace Chat</p>
          <p className="text-[11px] text-emerald-400 leading-tight">
            {onlineUsers.size > 1 ? `${onlineUsers.size - 1} online` : 'tap for group info'}
          </p>
        </div>

        {/* Right actions — only meaningful ones */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={generateMeetLink} title="Video call" className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
            <Video className="h-[18px] w-[18px]" />
          </button>
          <button onClick={() => setIsOpen(false)} className="hidden sm:flex p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* ── PINNED MESSAGES DRAWER ── */}
      {showPinned && (
        <div className="shrink-0 bg-[#1A1824] border-b border-white/[0.06] px-4 py-2.5 text-xs">
          <div className="flex items-center justify-between text-amber-400 font-semibold mb-1.5">
            <span className="flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned ({pinnedMessagesList.length})</span>
            <button onClick={() => setShowPinned(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          {pinnedMessagesList.length === 0 ? (
            <p className="text-gray-500 text-[11px]">No pinned messages.</p>
          ) : (
            <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar">
              {pinnedMessagesList.map(p => (
                <div key={p.id} className="flex justify-between items-start bg-white/5 px-2 py-1 rounded-lg">
                  <span className="text-gray-300 text-[11px] truncate pr-2"><span className="text-white font-semibold">{p.users?.username}: </span>{p.message}</span>
                  <button onClick={() => handlePinToggle(p.id, true)} className="text-amber-400 hover:text-red-400 text-[10px] shrink-0">Unpin</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES AREA ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-[#0B0B0F] custom-scrollbar"
      >
        {messages.map((msg: ChatMessage) => {
          const isMe = msg.user_id === user?.id;
          const isOnline = onlineUsers.has(msg.user_id);
          const parentMsg = msg.parent_id ? messages.find(m => m.id === msg.parent_id) : null;
          const initials = (msg.users?.username || '??').substring(0, 2).toUpperCase();

          // Interaction handler for both tap (mobile) and right-click (desktop)
          const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
            if (msg.is_deleted_everyone) return;
            // Don't open menu if they clicked a link
            if ((e.target as HTMLElement).closest('a')) return;
            e.preventDefault();

            let x = 0;
            let y = 0;
            if ('clientX' in e) {
              x = e.clientX;
              y = e.clientY;
            } else if (e.touches && e.touches.length > 0) {
              x = e.touches[0].clientX;
              y = e.touches[0].clientY;
            }

            // Adjust position so it doesn't go off screen
            const menuWidth = 220;
            const menuHeight = 250;
            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 20;
            if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 20;
            
            setContextMenu({ msg, x, y });
          };

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              onClick={handleInteraction}
              onContextMenu={handleInteraction}
            >
              {/* Avatar (only for others) */}
              {!isMe && (
                <div className="relative shrink-0 self-end mb-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-[10px] font-bold text-white">
                    {initials}
                  </div>
                  {isOnline && <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0B0B0F]" />}
                </div>
              )}

              {/* Bubble + meta */}
              <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>

                {/* Sender name (for others only) */}
                {!isMe && (
                  <span className="text-[11px] font-semibold text-indigo-400 ml-1 mb-0.5">{msg.users?.username || 'User'}</span>
                )}

                {/* Reply preview */}
                {parentMsg && (
                  <div className={`flex items-start gap-1 text-[10px] mb-0.5 px-2 py-1 rounded-lg border-l-2 border-indigo-500 bg-white/5 text-gray-400 max-w-full truncate ${isMe ? 'self-end' : 'self-start'}`}>
                    <Reply className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-300 shrink-0">{parentMsg.users?.username}:</span>
                    <span className="truncate">{parentMsg.message}</span>
                  </div>
                )}

                {/* Message bubble */}
                <div className={`relative px-3 py-2 text-[13px] leading-relaxed shadow-md select-none ${
                  isMe
                    ? 'bg-[#5B4BF0] text-white rounded-2xl rounded-br-sm'
                    : 'bg-[#1E1E2A] text-gray-100 border border-white/[0.06] rounded-2xl rounded-bl-sm'
                } ${msg.is_deleted_everyone ? 'opacity-60' : ''}`}>
                  {msg.is_deleted_everyone ? (
                    <em className="text-xs text-gray-400 italic flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> This message was deleted
                    </em>
                  ) : (
                    <MarkdownRenderer content={msg.message} />
                  )}
                </div>

                {/* Timestamp + edited */}
                <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] text-gray-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.is_edited && <span className="text-[10px] text-gray-600 italic">edited</span>}
                  {msg.is_pinned && <Pin className="w-2.5 h-2.5 text-amber-400" />}
                </div>

                {/* Reactions */}
                {msg.reactions && msg.reactions.length > 0 && !msg.is_deleted_everyone && (
                  <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                      const count = msg.reactions!.filter(r => r.emoji === emoji).length;
                      const hasMyReaction = msg.reactions!.some(r => r.emoji === emoji && r.user_id === user?.id);
                      return (
                        <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)}
                          className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-0.5 border transition-colors ${hasMyReaction ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                          {emoji}<span className="font-bold text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ✨ CONTEXT MENU POPUP (Attached to message) ✨ */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[10000] overflow-hidden"
          onClick={() => setContextMenu(null)}
        >
          {/* Invisible scrim to catch clicks outside */}
          <div className="absolute inset-0 bg-transparent" />

          {/* Popup Menu */}
          <div
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="absolute w-[220px] bg-[#2A2A38] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Message preview */}
            <div className="px-3 py-2 border-b border-white/[0.07] bg-white/[0.02]">
              <p className="text-[10px] text-indigo-400 font-semibold mb-0.5">{contextMenu.msg.users?.username}</p>
              <p className="text-[11px] text-gray-300 line-clamp-2">{contextMenu.msg.message}</p>
            </div>

            {/* Quick emoji row */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.07] bg-[#323242]">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { handleAddReaction(contextMenu.msg.id, emoji); setContextMenu(null); }}
                  className="text-xl hover:scale-125 transition-transform active:scale-110 select-none"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action list */}
            <div className="py-1">
              <button
                onClick={() => { setReplyingToMessage(contextMenu.msg); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors text-white"
              >
                <Reply className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs">Reply</span>
              </button>

              <button
                onClick={() => { handlePinToggle(contextMenu.msg.id, contextMenu.msg.is_pinned || false); setContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors text-white"
              >
                <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs">{contextMenu.msg.is_pinned ? 'Unpin message' : 'Pin message'}</span>
              </button>

              {contextMenu.msg.user_id === user?.id && (
                <>
                  <button
                    onClick={() => {
                      setEditingMessageId(contextMenu.msg.id);
                      setNewMessage(contextMenu.msg.message);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors text-white"
                  >
                    <Edit2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs">Edit message</span>
                  </button>

                  <div className="h-px bg-white/[0.06] mx-3 my-0.5" />

                  <button
                    onClick={() => { handleDeleteMessage(contextMenu.msg.id); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 active:bg-red-500/15 transition-colors text-red-400"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="text-xs">Delete message</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INPUT BAR (WhatsApp style) ── */}
      <div className="shrink-0 bg-[#161620] border-t border-white/[0.06] px-2 py-2">
        {/* Reply banner */}
        {replyingToMessage && (
          <div className="mb-2 flex items-center justify-between bg-indigo-500/10 border-l-2 border-indigo-500 pl-3 pr-2 py-1.5 rounded-r-xl text-xs">
            <div className="flex items-center gap-1.5 truncate text-indigo-300">
              <Reply className="w-3 h-3 shrink-0" />
              <span className="font-semibold shrink-0 text-white">{replyingToMessage.users?.username}</span>
              <span className="truncate text-gray-400">{replyingToMessage.message}</span>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="text-gray-500 hover:text-white ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Edit banner */}
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between bg-blue-500/10 border-l-2 border-blue-500 pl-3 pr-2 py-1.5 rounded-r-xl text-xs">
            <span className="flex items-center gap-1.5 text-blue-300 font-semibold"><Edit2 className="w-3 h-3" /> Editing message</span>
            <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }} className="text-red-400 hover:text-red-300 text-[11px]">Cancel</button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#0F0F17] border border-white/[0.08] rounded-full px-4 py-2.5 gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
              placeholder={editingMessageId ? 'Edit message…' : 'Message…'}
              className="flex-1 bg-transparent text-[13px] text-gray-200 placeholder:text-gray-600 focus:outline-none"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-indigo-900/40 shrink-0"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.3); }
      `}</style>
    </div>,
    document.body
  );
}


