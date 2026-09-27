import { useAuth } from '@/hooks/useAuth';
import { Building, Shield, Bell, ExternalLink } from 'lucide-react';
import { pushNotificationService } from '@/services/pushNotificationService';
import { notificationService } from '@/utils/notificationService';
import { notebookLMService } from '@/services/notebookLMService';
import AdminSupportLinksManagerModal from '@/components/AdminSupportLinksManagerModal';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function CRMSettings() {
  const { user, supabaseUser } = useAuth();
  const [pushStatus, setPushStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notebookUrl, setNotebookUrl] = useState(() => notebookLMService.getStoredUrl());
  const [savingUrl, setSavingUrl] = useState(false);
  const [devNotebookUrl, setDevNotebookUrl] = useState(() => notebookLMService.getDevStoredUrl());
  const [savingDevUrl, setSavingDevUrl] = useState(false);
  const [isAdminLinksManagerOpen, setIsAdminLinksManagerOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user?.workspace_id) {
      notebookLMService.fetchWorkspaceUrl(user.workspace_id).then(url => setNotebookUrl(url));
      notebookLMService.fetchDevWorkspaceUrl(user.workspace_id).then(url => setDevNotebookUrl(url));
    }
  }, [user?.workspace_id]);

  const handleSaveNotebookUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUrl(true);
    try {
      const ok = await notebookLMService.saveWorkspaceUrl(notebookUrl, user?.workspace_id);
      if (ok) {
        toast.success("Sales AI Knowledge Base URL updated!");
      } else {
        toast.error("Please enter a valid URL.");
      }
    } catch {
      toast.error("Failed to save URL.");
    } finally {
      setSavingUrl(false);
    }
  };

  const handleSaveDevNotebookUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDevUrl(true);
    try {
      const ok = await notebookLMService.saveDevWorkspaceUrl(devNotebookUrl, user?.workspace_id);
      if (ok) {
        toast.success("Developer Support Knowledge Base URL updated for workspace!");
      } else {
        toast.error("Please enter a valid URL.");
      }
    } catch {
      toast.error("Failed to save Dev Support URL.");
    } finally {
      setSavingDevUrl(false);
    }
  };

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    const success = await pushNotificationService.subscribeToPushNotifications();
    if (success) {
      setPushStatus('granted');
    } else {
      setPushStatus(Notification.permission);
    }
    setIsSubscribing(false);
  };

  const handleTestPush = () => {
    notificationService.showNotification('Test Notification', {
      body: 'This is a test notification from CRM Settings.',
      tag: 'test-push',
      requireInteraction: false
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest">Settings</h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 sm:mt-1">Workspace and account configuration</p>
      </div>

      {/* Account Info */}
      <div className="bg-[#111116] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Account</h2>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-black text-white">
            {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() || 'OA'}
          </div>
          <div>
            <p className="font-black text-white text-lg">{user?.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-500">{supabaseUser?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[9px] text-indigo-400 font-black uppercase">
              <Shield size={9}/> {user?.role || 'Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="bg-[#111116] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Workspace</h2>
        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
          <Building size={14} className="text-indigo-400"/>
          <div>
            <p className="text-xs font-bold text-white">Workspace ID</p>
            <p className="text-[10px] text-gray-600 font-mono">{user?.workspace_id || '—'}</p>
          </div>
        </div>
      </div>

      {/* CRM Config */}
      <div className="bg-[#111116] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">CRM Configuration</h2>
        {[
          { label: 'Auto-task on stage change', status: 'Enabled', color: 'text-emerald-400' },
          { label: 'Overdue task alerts', status: 'Enabled', color: 'text-emerald-400' },
          { label: 'CSV bulk import', status: 'Enabled', color: 'text-emerald-400' },
          { label: 'Row Level Security', status: 'Active', color: 'text-emerald-400' },
          { label: 'Pipeline stages', status: '10 Stages', color: 'text-indigo-400' },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-gray-400">{item.label}</span>
            <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.status}</span>
          </div>
        ))}
      </div>



      {/* Push Notifications Configuration */}
      <div className="bg-[#111116] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Bell size={14} /> Push Notifications
          </h2>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-500">
              Status:
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
              {pushStatus === 'granted' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Enabled</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Not Enabled</span>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Enable background push notifications to receive real-time alerts for tasks, leads, and chat messages even when the app is closed.
        </p>

        <div className="flex items-center gap-3 pt-2">
          {pushStatus !== 'granted' && (
            <button
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
            </button>
          )}
          
          <button
            onClick={handleTestPush}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10 active:scale-95"
          >
            Test Local Push
          </button>
        </div>
      </div>

      {/* Sales Support Assistant Knowledge Base Configuration (Admin Managed) */}
      <div className="bg-[#111116] border border-purple-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/robot-assistant.png" alt="Support" className="w-6 h-6 object-contain" />
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <span>Support Knowledge Base</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  NotebookLM
                </span>
              </h2>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Sales knowledge assistant connection</p>
            </div>
          </div>
          
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {isAdmin ? 'Admin Config' : 'Workspace Active'}
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Configure the Google NotebookLM chat view URL for your sales team. When updated by an admin, all sales reps will instantly access this notebook from their sidebar <strong>Support</strong> button.
        </p>

        <form onSubmit={handleSaveNotebookUrl} className="space-y-3 pt-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              NotebookLM Chat View URL
            </label>
            <input
              type="url"
              value={notebookUrl}
              onChange={(e) => setNotebookUrl(e.target.value)}
              disabled={!isAdmin}
              placeholder="https://notebooklm.google.com/notebook/YOUR_NOTEBOOK_ID"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const popup = notebookLMService.openCompanionWindow(notebookUrl);
                if (!popup || popup.closed) {
                  toast.error("Popup blocked! Please allow popups for this site in your browser to open Ooma AI.");
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-white/10 active:scale-95"
            >
              <ExternalLink size={14} /> Test 390px Window
            </button>

            {isAdmin && (
              <button
                type="submit"
                disabled={savingUrl}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                {savingUrl ? 'Saving...' : 'Save Workspace AI Link'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Developer & Workspace Support Assistant Knowledge Base Configuration */}
      <div className="bg-[#111116] border border-blue-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg shadow-blue-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/robot-assistant.png" alt="Dev Support" className="w-6 h-6 object-contain" />
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <span>Developer Support Knowledge Base</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  DEV AI
                </span>
              </h2>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Developer & technical workspace assistant connection</p>
            </div>
          </div>
          
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
            {isAdmin ? 'Admin Config' : 'Workspace Active'}
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Configure the Google NotebookLM or technical documentation URL for developers and workspace members. All users can launch this companion from their <strong>Support (DEV AI)</strong> sidebar menu item.
        </p>

        <form onSubmit={handleSaveDevNotebookUrl} className="space-y-3 pt-1">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
              Developer Support Notebook / Docs URL
            </label>
            <input
              type="url"
              value={devNotebookUrl}
              onChange={(e) => setDevNotebookUrl(e.target.value)}
              disabled={!isAdmin}
              placeholder="https://notebooklm.google.com/notebook/YOUR_DEV_NOTEBOOK_ID"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const popup = notebookLMService.openDevCompanionWindow(devNotebookUrl);
                  if (!popup || popup.closed) {
                    toast.error("Popup blocked! Please allow popups for this site in your browser to open Dev Support AI.");
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-white/10 active:scale-95"
              >
                <ExternalLink size={14} /> Test Dev Companion Window
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAdminLinksManagerOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold rounded-xl transition-all border border-purple-500/30 active:scale-95"
                >
                  Manage All Support Links
                </button>
              )}
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={savingDevUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                {savingDevUrl ? 'Saving...' : 'Save Dev AI Link'}
              </button>
            )}
          </div>
        </form>
      </div>

      <AdminSupportLinksManagerModal
        isOpen={isAdminLinksManagerOpen}
        onClose={() => setIsAdminLinksManagerOpen(false)}
      />
    </div>
  );
}
