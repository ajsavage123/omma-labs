import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, Loader2, Rocket, ArrowLeft, LogOut, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const { supabaseUser, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create state
  const [workspaceName, setWorkspaceName] = useState('');
  const [username, setUsername] = useState('');
  const [designation, setDesignation] = useState<any>('Innovation & Research Team');
  
  // Join state
  const [inviteCode, setInviteCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUser) return;
    setLoading(true);
    setError('');

    try {
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          created_by: supabaseUser.id
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: supabaseUser.id,
          username: username,
          role: 'admin',
          designation: designation,
          workspace_id: workspaceData.id
        });

      if (userError) throw userError;

      await refreshUser();
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUser) return;
    setLoading(true);
    setError('');

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', inviteCode)
        .eq('used', false)
        .single();

      if (inviteError || !inviteData) throw new Error('Invalid or expired invitation code');

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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                WORKSPACE SETUP
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
                {mode === 'select' && 'Welcome to Ooma Labs'}
                {mode === 'create' && 'Create Your Workspace'}
                {mode === 'join' && 'Join a Workspace'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {mode === 'select' && 'Choose how you want to get started.'}
                {mode === 'create' && 'Set up your innovation pipeline.'}
                {mode === 'join' && 'Enter your team invite credentials.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
              </div>
            )}

            {/* Mode Selection */}
            {mode === 'select' && (
              <div className="space-y-4">
                <button
                  onClick={() => setMode('create')}
                  className="w-full flex items-center p-5 border border-white/10 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center">
                    <div className="h-12 w-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mr-4 group-hover:bg-indigo-500/20 transition-colors">
                      <Building2 className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">Create New Workspace</h3>
                      <p className="text-xs text-gray-500 mt-1">Start a fresh innovation pipeline and invite your team.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="w-full flex items-center p-5 border border-white/10 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center">
                    <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mr-4 group-hover:bg-emerald-500/20 transition-colors">
                      <KeyRound className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">Join Existing Workspace</h3>
                      <p className="text-xs text-gray-500 mt-1">I have an invite code from an Administrator.</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Create Workspace Form */}
            {mode === 'create' && (
              <form onSubmit={handleCreateWorkspace} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Workspace Name</label>
                  <input
                    required type="text" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Innovations"
                    className="block w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-black/50 transition-all sm:text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Full Name</label>
                  <input
                    required type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="block w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-black/50 transition-all sm:text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Starting Designation</label>
                  <select
                    value={designation} onChange={e => setDesignation(e.target.value)}
                    className="block w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-gray-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-black/50 transition-all sm:text-sm outline-none"
                  >
                    <option value="Innovation & Research Team">Innovation & Research Team</option>
                    <option value="Developer & Engineering Team">Developer & Engineering Team</option>
                    <option value="Business Strategy & Marketing Team">Business Strategy & Marketing Team</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-2 border-l-2 border-indigo-500/50 pl-3">As the creator, you are an Admin and can change designations later.</p>
                </div>
                
                <div className="flex gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setMode('select')} 
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Launch Workspace'}
                  </button>
                </div>
              </form>
            )}

            {/* Join Workspace Form */}
            {mode === 'join' && (
              <form onSubmit={handleJoinWorkspace} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Invite Code</label>
                  <input
                    required type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                    className="block w-full px-4 py-4 bg-black/30 border border-white/10 rounded-xl text-emerald-300 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:bg-black/50 transition-all text-center uppercase font-mono tracking-[0.3em] text-lg outline-none"
                    placeholder="XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Your Full Name</label>
                  <input
                    required type="text" value={joinUsername} onChange={e => setJoinUsername(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="block w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:bg-black/50 transition-all sm:text-sm outline-none"
                  />
                </div>
                
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  <p className="text-xs text-emerald-400/70 text-center">Your role and department have been pre-assigned by your administrator via the invite code.</p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setMode('select')} 
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Join Workspace'}
                  </button>
                </div>
              </form>
            )}
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
