import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { crmAccessService } from '@/services/crmAccessService';
import { ShieldAlert, Lock, Clock, XCircle } from 'lucide-react';

interface CRMAccessGuardProps {
  children: ReactNode;
}

export function CRMAccessGuard({ children }: CRMAccessGuardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'none' | 'pending' | 'approved' | 'rejected'>('loading');
  const [requesting, setRequesting] = useState(false);

  const isDev = user?.designation === 'Developer & Engineering Team';

  useEffect(() => {
    if (!user) return;
    if (!isDev) {
      setStatus('approved');
      return;
    }

    fetchStatus();
  }, [user, isDev]);

  const fetchStatus = async () => {
    if (!user?.id || !user?.workspace_id) return;
    try {
      const s = await crmAccessService.getAccessStatus(user.id, user.workspace_id);
      setStatus(s as any);
    } catch (err) {
      console.error(err);
      setStatus('none');
    }
  };

  const handleRequestAccess = async () => {
    if (!user?.id || !user?.workspace_id) return;
    setRequesting(true);
    try {
      await crmAccessService.requestAccess(user.id, user.workspace_id);
      setStatus('pending');
    } catch (err) {
      alert("Failed to request access.");
    } finally {
      setRequesting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-pulse text-indigo-400 font-bold uppercase tracking-widest text-xs">Verifying Access Level...</div>
      </div>
    );
  }

  if (status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 relative">
          <Lock className="h-10 w-10 text-indigo-400" />
          <div className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-lg shadow-lg">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Restricted</h1>
        <p className="text-gray-400 max-w-md mb-8 text-sm leading-relaxed">
          The <span className="text-indigo-400 font-bold">CRM Pipeline</span> is restricted for your current designation. 
          You must request authorization from the workspace administrator to access these sales operations.
        </p>

        {status === 'none' && (
          <button
            onClick={handleRequestAccess}
            disabled={requesting}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {requesting ? 'Processing Request...' : 'Request Access Authorization'}
          </button>
        )}

        {status === 'pending' && (
          <div className="flex flex-col items-center gap-3">
            <div className="px-6 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 font-bold text-xs flex items-center gap-2">
              <Clock className="h-4 w-4" />
              AUTHORIZATION PENDING
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Awaiting admin approval...</p>
          </div>
        )}

        {status === 'rejected' && (
          <div className="flex flex-col items-center gap-3">
            <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 font-bold text-xs flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              ACCESS DENIED BY ADMIN
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Please contact your manager for further assistance.</p>
          </div>
        )}

        <button 
          onClick={() => window.location.href = '/'} 
          className="mt-12 text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
