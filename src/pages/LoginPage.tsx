import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Briefcase, ChevronDown } from 'lucide-react';
import { OomaLogo } from '@/components/OomaLogo';
import type { Designation } from '@/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [designation, setDesignation] = useState<Designation>('Innovation & Research Team');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed. Please try again.');

      await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          full_name: username,
          username: username,
          designation: designation,
          role: 'partner'
        }, { onConflict: 'id' });
      
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <OomaLogo className="text-white" size={24} />
            </div>
            <span className="text-white font-extrabold text-xl tracking-tight">Ooma <span className="text-indigo-400 font-bold">Workspace</span></span>
          </div>

          <div>
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Innovation<br />starts<br />
              <span className="text-indigo-400">right here.</span>
            </h1>
            <p className="text-indigo-200/60 text-lg leading-relaxed max-w-sm">
              A private platform where ideas become products — through structured pipelines, team workrooms, and data-driven innovation scoring.
            </p>
          </div>
        </div>

        <div className="relative space-y-3">
          {['Ideology & Research', 'Development & Deployment', 'Business & Marketing', 'Admin Approval'].map((step, i) => (
            <div key={step} className="flex items-center gap-4 text-sm text-indigo-100 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-lg shadow-indigo-500/20">
                {i + 1}
              </span>
              <span className="font-bold opacity-80">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-[#0A0A0B] overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center border border-indigo-400/30 shadow-lg shadow-indigo-500/20">
            <OomaLogo className="text-white" size={20} />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">Ooma <span className="text-indigo-400">Workspace</span></span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white mb-2">Secure Access</h2>
            <p className="text-gray-500 text-sm font-medium">
              Initialize your innovation session with admin credentials.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 scale-90 origin-left">Identity Handle</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-400">
                  <span className="text-gray-500 font-bold text-sm">@</span>
                </div>
                <input
                  type="text" required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 scale-90 origin-left">Department</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400" />
                </div>
                <select
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value as Designation)}
                  className="w-full pl-11 pr-10 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="Innovation & Research Team">Innovation & Research</option>
                  <option value="Developer & Engineering Team">Engineering & Dev</option>
                  <option value="Business Strategy & Marketing Team">Business & Marketing</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 scale-90 origin-left">Authentication Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400" />
                </div>
                <input
                  type="email" required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                  placeholder="team@ooma.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 scale-90 origin-left">Security Pass</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-indigo-400" />
                </div>
                <input
                  type="password" required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#121216] border border-[#1F1F26] rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black rounded-2xl hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Establish Connection 
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-600 mt-12 font-bold uppercase tracking-widest">
            Private Intel Project — Access Logged
          </p>
        </div>
      </div>
    </div>
  );
}
