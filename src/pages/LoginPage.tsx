import { useState, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { OomaLogo } from '@/components/OomaLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase Auth (Email/Password)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed.');

      // 2. Fetch the existing record to determine the role for routing
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
          await supabase.auth.signOut();
          throw new Error('Access Denied: Your profile has not been activated by the administrator.');
      }

      // Route based on role
      navigate(profile.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Access Denied. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0B]">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900 p-12 relative overflow-hidden border-r border-indigo-500/10">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <OomaLogo className="text-white" size={40} />
            <span className="text-white font-extrabold text-xl tracking-tight">Ooma <span className="text-indigo-400 font-bold">Workspace</span></span>
          </div>

          <div>
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Innovation<br />starts<br />
              <span className="text-indigo-400">right here.</span>
            </h1>
            <p className="text-indigo-200/60 text-lg leading-relaxed max-w-sm font-medium">
              A private platform where ideas become products through structured pipelines and data-driven innovation scoring.
            </p>
          </div>
        </div>

        <div className="relative space-y-3">
          {['Access System', 'Establish Connection'].map((step, i) => (
            <div key={step} className="flex items-center gap-4 text-sm text-indigo-100 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-lg shadow-indigo-500/20">
                {i + 1}
              </span>
              <span className="font-extrabold opacity-80 uppercase tracking-widest text-[10px]">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[#0A0A0B] overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
            <OomaLogo className="text-white" size={32} />
          <span className="text-white font-extrabold text-xl tracking-tight">Ooma <span className="text-indigo-400">Workspace</span></span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-white mb-2">Secure Access</h2>
            <p className="text-gray-500 text-sm font-bold flex items-center gap-2 justify-center lg:justify-start">
               Verify your Credentials to Proceed
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
              {/* Credential 1: Email */}
            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2.5 scale-90 origin-left">1. Registered Intel Mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="email" required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                  placeholder="name@omma.io"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Credential 2: Password */}
            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2.5 scale-90 origin-left">2. Security Passcode</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="password" required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-shake">
                <p className="text-red-400 text-[11px] font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black rounded-2xl hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Establish Auth Link 
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-[#1F1F26]">
            <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
              Private Innovation Workspace<br />
              <span className="text-gray-700">All authentication attempts are audited</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
