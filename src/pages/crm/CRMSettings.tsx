import { useAuth } from '@/hooks/useAuth';
import { Building, Shield } from 'lucide-react';

export default function CRMSettings() {
  const { user, supabaseUser } = useAuth();

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
    </div>
  );
}
