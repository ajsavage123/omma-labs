import { useState, useEffect, useRef } from 'react';
import { 
  X, Send, RefreshCw, ExternalLink, Settings, ArrowRight, Minus, Maximize2
} from 'lucide-react';
import { supportLinksService, DEPARTMENTS } from '@/services/supportLinksService';
import type { SupportLink } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  departmentId?: string;
  topics?: SupportLink[];
  showDepartments?: boolean;
  timestamp: string;
}

interface SupportChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminManager?: () => void;
}

export default function SupportChatWidget({
  isOpen,
  onClose,
  onOpenAdminManager
}: SupportChatWidgetProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [links, setLinks] = useState<SupportLink[]>(() => supportLinksService.getStoredLinks());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initGreeting = () => {
    setMessages([
      {
        id: 'msg-greeting',
        sender: 'bot',
        text: 'Hii! 👋 How can I help you today? Please select your department first to see relevant topics & AI knowledge bases:',
        showDepartments: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  useEffect(() => {
    if (user?.workspace_id) {
      supportLinksService.fetchWorkspaceLinks(user.workspace_id).then(fetched => {
        setLinks(fetched);
      });
    }

    const handleLinksChanged = (e: CustomEvent) => {
      if (e.detail) setLinks(e.detail);
    };

    window.addEventListener('workspace-support-links-changed' as any, handleLinksChanged);
    return () => {
      window.removeEventListener('workspace-support-links-changed' as any, handleLinksChanged);
    };
  }, [user?.workspace_id]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initGreeting();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleLaunchTopic = (topic: SupportLink) => {
    const popup = supportLinksService.launchSupportCompanion(topic.url, topic.title);
    if (!popup || popup.closed) {
      toast.error('Popup blocked! Please allow popups for this site in your browser.');
    } else {
      toast.success(`Opening "${topic.title}" in 390px companion window...`);
    }
  };

  if (!isOpen) return null;

  const handleSelectDepartment = (deptName: string) => {
    // 1. Add user selection message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: deptName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Filter links matching department
    const deptLinks = links.filter(l => 
      l.category.toLowerCase().includes(deptName.split('&')[0].trim().toLowerCase()) ||
      deptName.toLowerCase().includes(l.category.split('&')[0].trim().toLowerCase())
    );

    // Fallback if no specific links match category
    const matchingTopics = deptLinks.length > 0 ? deptLinks : links;

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Here are the top support topics & AI knowledge bases available for ${deptName}:`,
        topics: matchingTopics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    }, 450);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Find matching topic links by search query
    const searchMatches = links.filter(l => 
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      (l.description || '').toLowerCase().includes(query.toLowerCase()) ||
      (l.category || '').toLowerCase().includes(query.toLowerCase())
    );

    setTimeout(() => {
      setIsTyping(false);
      if (searchMatches.length > 0) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Found ${searchMatches.length} matching support knowledge base(s) for "${query}":`,
          topics: searchMatches,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `I couldn't find an exact match for "${query}". Please select a department below or choose from all available support topics:`,
          topics: links,
          showDepartments: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    }, 500);
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] bg-[#13131e] hover:bg-[#1a1a2c] border border-purple-500/40 text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95 group animate-in fade-in"
        title="Restore AI Support Bot"
      >
        <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center p-1">
          <img src="/robot-assistant.png" alt="Bot" className="w-4 h-4 object-contain" />
        </div>
        <span className="text-xs font-bold text-gray-200 group-hover:text-white">Support Bot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <Maximize2 size={13} className="text-purple-400 ml-1 group-hover:scale-110 transition-transform" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100%-32px)] sm:w-[390px] h-[580px] max-h-[85vh] bg-[#0c0c12] border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-sans text-gray-200 animate-in slide-in-from-bottom-5 duration-200">
      
      {/* ── TOP MINI CHAT HEADER ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#13131e] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center p-1">
              <img src="/robot-assistant.png" alt="Bot Avatar" className="w-5 h-5 object-contain" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#13131e]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
              <span>Workspace Support Bot</span>
              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                AI
              </span>
            </h3>
            <p className="text-[10px] text-emerald-400 font-medium leading-tight">Online • Select Department & Topic</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Minimize Assistant"
          >
            <Minus size={14} />
          </button>

          <button
            onClick={initGreeting}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Reset Chat"
          >
            <RefreshCw size={14} />
          </button>
          
          {isAdmin && onOpenAdminManager && (
            <button
              onClick={() => {
                onClose();
                onOpenAdminManager();
              }}
              className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="Admin Manage Links"
            >
              <Settings size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close Assistant"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── CHAT MESSAGES AREA ── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 custom-scrollbar bg-[#09090e]">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
              {/* Bot Avatar */}
              {isBot && (
                <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 self-start mt-0.5">
                  <img src="/robot-assistant.png" alt="Bot" className="w-4 h-4 object-contain" />
                </div>
              )}

              {/* Message Content Bubble */}
              <div className={`flex flex-col max-w-[85%] ${isBot ? 'items-start' : 'items-end'}`}>
                <div 
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isBot 
                      ? 'bg-[#151522] text-gray-100 border border-white/10 rounded-tl-sm shadow-md' 
                      : 'bg-purple-600 text-white rounded-tr-sm shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Interactive Department Options */}
                {msg.showDepartments && (
                  <div className="mt-2.5 space-y-1.5 w-full">
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => handleSelectDepartment(dept.name)}
                        className="w-full text-left px-3 py-2 bg-gradient-to-r hover:from-purple-600/20 hover:to-indigo-600/20 bg-white/5 border border-white/10 hover:border-purple-500/40 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-all flex items-center justify-between group active:scale-[0.98]"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{dept.icon}</span>
                          <span>{dept.name}</span>
                        </span>
                        <ArrowRight size={13} className="text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Interactive Topic Cards List */}
                {msg.topics && msg.topics.length > 0 && (
                  <div className="mt-2.5 space-y-2 w-full">
                    {msg.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="bg-[#12121e] border border-white/10 hover:border-purple-500/40 rounded-xl p-3 transition-all flex flex-col gap-2 group shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                              {topic.title}
                            </h4>
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 shrink-0">
                              {topic.category.split('&')[0].trim()}
                            </span>
                          </div>
                          {topic.description && (
                            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                              {topic.description}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleLaunchTopic(topic)}
                          className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 mt-1"
                        >
                          <span>Open AI Assistant</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={initGreeting}
                      className="w-full py-1.5 text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-lg transition-all"
                    >
                      ↩ Change Department
                    </button>
                  </div>
                )}

                <span className="text-[9px] text-gray-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <img src="/robot-assistant.png" alt="Bot" className="w-4 h-4 object-contain animate-bounce" />
            </div>
            <div className="bg-[#151522] border border-white/10 px-3 py-2 rounded-2xl flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-100" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-200" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── CHAT INPUT BAR ── */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-[#13131e] border-t border-white/10 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Ask a question or search topic..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 px-3 py-2 bg-[#09090e] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
