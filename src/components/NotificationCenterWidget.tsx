import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, MessageSquare, Briefcase, CheckCircle, Activity, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { type WorkspaceNotificationEvent } from '@/services/workspaceNotificationService';
import { useNavigate } from 'react-router-dom';
type NotificationWithMeta = WorkspaceNotificationEvent & { isRead?: boolean, createdAt?: string };

export default function NotificationCenterWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Check CRM Access
  const hasCRMAccess = user?.role === 'admin' || 
    user?.designation?.includes('Business Strategy & Marketing Team') ||
    user?.designation?.includes('Marketing & Business');

  useEffect(() => {
    if (!user) return;
    
    // Load existing notifications from DB if available
    const loadDBNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (!error && data) {
          // Format them to WorkspaceNotificationEvent
          const mapped = data.map((d: any) => ({
            id: d.id,
            category: d.category,
            title: d.title,
            body: d.body,
            targetUrl: d.target_url,
            isRead: d.is_read,
            createdAt: d.created_at
          }));
          
          // Filter out CRM notifications if user shouldn't see them
          const filtered = hasCRMAccess 
            ? mapped 
            : mapped.filter((n: any) => n.category !== 'task' && n.category !== 'lead' && n.category !== 'activity');
            
          setNotifications(filtered);
          setUnreadCount(filtered.filter((n: any) => !n.isRead).length);
        }
      } catch (err) {
        console.error('Failed to load DB notifications', err);
      }
    };
    
    loadDBNotifications();

    // Listen for incoming notifications from the global manager
    const handleNewNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationWithMeta>;
      if (customEvent.detail) {
        const notif = customEvent.detail;
        
        // Filter CRM notifications for non-CRM users
        if (!hasCRMAccess && ['task', 'lead', 'activity'].includes(notif.category)) {
          return;
        }
        
        setNotifications(prev => {
          // Avoid duplicates in memory
          if (prev.some(n => n.id === notif.id)) return prev;
          return [notif, ...prev].slice(0, 50);
        });
        setUnreadCount(prev => prev + 1);
      }
    };

    window.addEventListener('workspace-notification-received', handleNewNotification);

    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('workspace-notification-received', handleNewNotification);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user, hasCRMAccess]);

  const markAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false);
    } catch (e) {}
  };

  const handleNotificationClick = (notif: WorkspaceNotificationEvent & { isRead?: boolean }) => {
    // Mark as read locally
    if (!notif.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      // Try to mark read in DB
      Promise.resolve(supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)).catch(() => {});
    }
    
    setIsOpen(false);

    if (notif.targetUrl) {
      if (notif.targetUrl.includes('open_chat=true')) {
        window.dispatchEvent(new CustomEvent('open_chat_widget'));
      } else {
        navigate(notif.targetUrl);
      }
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'chat': return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'task': return <CheckCircle className="h-4 w-4 text-indigo-400" />;
      case 'lead': return <Briefcase className="h-4 w-4 text-emerald-400" />;
      case 'activity': return <Activity className="h-4 w-4 text-amber-400" />;
      default: return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={widgetRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all active:scale-95 group"
      >
        <Bell className={`h-5 w-5 text-gray-400 group-hover:text-white transition-colors ${unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 min-w-4 px-1 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center transform translate-x-1/4 -translate-y-1/4 shadow-sm border border-[#0c0c0e]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 md:w-96 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-in-right flex flex-col max-h-[80vh] z-[999]">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-400" />
              <h3 className="font-black text-white uppercase tracking-widest text-[11px]">Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark Read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              <div className="divide-y divide-white/5">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif as any)}
                    className={`p-4 cursor-pointer transition-all hover:bg-white/[0.03] flex items-start gap-3 relative overflow-hidden group ${!notif.isRead ? 'bg-indigo-500/[0.02]' : ''}`}
                  >
                    {!notif.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                    )}
                    
                    <div className={`p-2 rounded-xl shrink-0 ${!notif.isRead ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/5 border border-white/5'}`}>
                      {getIconForCategory(notif.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className={`text-[12px] font-bold truncate ${!notif.isRead ? 'text-white' : 'text-gray-300'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                        {notif.body}
                      </p>
                      <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-2 block">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>

                    {notif.targetUrl && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3 text-gray-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-40">
                <Bell className="h-8 w-8 text-gray-700 mb-3" />
                <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">All Caught Up</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
