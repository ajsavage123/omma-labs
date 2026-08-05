import { useAuth } from '@/hooks/useAuth';
import { Building, Shield, Bell } from 'lucide-react';

import SupabaseQuotaHealth from '@/components/admin/SupabaseQuotaHealth';
import { pushNotificationService } from '@/services/pushNotificationService';
import { notificationService } from '@/utils/notificationService';
import { useState, useEffect } from 'react';

export default function CRMSettings() {
  const { user, supabaseUser } = useAuth();
  const [pushStatus, setPushStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isSubscribing, setIsSubscribing] = useState(false);

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
    <div className="p-6 md:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-black text-white uppercase tracking-widest">Settings</h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Workspace and account configuration</p>
      </div>

      {/* Account Info */}
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 space-y-4">
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
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 space-y-3">
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
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 space-y-3">
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

      {/* Supabase Quota & Workspace Health Monitor (Admin Only) */}
      <SupabaseQuotaHealth />

      {/* Push Notifications Configuration */}
      <div className="bg-[#111116] border border-white/5 rounded-2xl p-6 space-y-4">
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
    </div>
  );
}
