import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Zap, ArrowRight, Briefcase } from 'lucide-react';
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
      // 1. Log in with credentials provided by admin
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed. Please try again.');

      // 2. Ensure their profile exists in our 'users' table with their username
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          full_name: username, // Fallback full name to username 
          username: username,
          designation: designation,
          role: 'partner' // Admin accounts will overwrite this manually later or maintain their role if handled via separate triggers
        }, { onConflict: 'id', ignoreDuplicates: false });

      if (profileError) {
        // If we fail to update the profile due to permissions, it's okay, they are still logged in.
        console.warn('Could not update profile, but login successful:', profileError);
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-900 p-12 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-extrabold text-xl">Ooma Workspace</span>
          </div>

          <div>
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Innovation<br />starts<br />
              <span className="text-indigo-300">right here.</span>
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
              A private platform where ideas become products — through structured pipelines, team workrooms, and data-driven innovation scoring.
            </p>
          </div>
        </div>

        {/* Pipeline steps preview */}
        <div className="relative space-y-3">
          {['Ideology & Research', 'Development & Deployment', 'Business & Marketing', 'Admin Approval'].map((step, i) => (
            <div key={step} className="flex items-center gap-3 text-sm text-indigo-200">
              <span className="h-6 w-6 rounded-full bg-white/10 text-white text-center flex items-center justify-center font-bold text-xs flex-shrink-0">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-gray-50 overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-gray-900 font-extrabold text-lg">Ooma Workspace</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Sign into Workspace</h2>
            <p className="text-gray-500 text-sm">
              Use the credentials provided by your application admin.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username / Handle</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-bold text-sm">@</span>
                    </div>
                    <input
                      type="text" required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="ajay_innovator"
                      value={username}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Team Designation</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      required
                      value={designation}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDesignation(e.target.value as Designation)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                      <option value="Innovation & Research Team">Innovation & Research</option>
                      <option value="Developer & Engineering Team">Engineering & Dev</option>
                      <option value="Business Strategy & Marketing Team">Business & Marketing</option>
                    </select>
                  </div>
                </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email" required autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="team@ommalabs.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password" required autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 font-extrabold text-[10px]">!</span>
                </div>
                <p className="text-red-700 text-xs font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entering Workspace…
                </>
              ) : (
                <>
                  Enter Workspace 
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-gray-400 mt-8">
            Private workspace — innovation intellectual property protected.
          </p>
        </div>
      </div>
    </div>
  );
}
