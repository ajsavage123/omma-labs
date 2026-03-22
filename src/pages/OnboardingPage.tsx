import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, Rocket, LogOut, ShieldCheck } from 'lucide-react';

export default function OnboardingPage() {
  const { supabaseUser, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUser) return;
    setLoading(true);
    setError('');

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', inviteCode.trim().toUpperCase())
        .eq('used', false)
        .single();

      if (inviteError || !inviteData) throw new Error('Invalid or expired invitation code. Please contact your administrator.');

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: supabaseUser.id,
          username: joinUsername,
          role: inviteData.role,
          designation: inviteData.designation,
          workspace_id: inviteData.workspace_id
        });

      if (userError) throw userError;

      await supabase
        .from('invitations')
        .update({ used: true })
        .eq('id', inviteData.id);

      await refreshUser();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to join workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0a0f1c] overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Animated Background Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-indigo-600/15 rounded-full animate-pulse" style={{ filter: 'blur(150px)', animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full animate-pulse" style={{ filter: 'blur(150px)', animationDuration: '6s', animationDelay: '2s' }}></div>
      <div className="absolute top-[30%] left-[55%] w-[25%] h-[25%] bg-purple-600/10 rounded-full animate-pulse" style={{ filter: 'blur(120px)', animationDuration: '10s' }}></div>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-[#0a0f1c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Rocket className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-lg">Ooma Labs</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm hidden sm:inline">{supabaseUser?.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 rounded-lg text-xs font-medium transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-4 pt-20">
        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
          {/* Gradient Top Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-5 mx-auto">
                <KeyRound className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
                Join Ooma Workspace
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Enter the invite code provided by your administrator.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            {/* Join Workspace Form */}
            <form onSubmit={handleJoinWorkspace} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Invite Code</label>
                <input
                  required
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  className="block w-full px-4 py-4 bg-black/30 border border-white/10 rounded-xl text-indigo-300 placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-black/50 transition-all text-center uppercase font-mono tracking-[0.3em] text-lg outline-none"
                  placeholder="XXXX-XXXX"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Full Name</label>
                <input
                  required
                  type="text"
                  value={joinUsername}
                  onChange={e => setJoinUsername(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="block w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-black/50 transition-all sm:text-sm outline-none"
                />
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-indigo-400/70 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-400/70 leading-relaxed">
                  Your role and department are pre-assigned by your administrator through the invite code. Contact your admin if you don't have one.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Join Workspace'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          &copy; {new Date().getFullYear()} Ooma Labs Innovation Group.<br/> All rights reserved. Secure environment.
        </p>
      </div>
    </div>
  );
}
