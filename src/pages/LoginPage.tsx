import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Rocket, Workflow, PieChart } from 'lucide-react';
import { OomaLogo } from '@/components/OomaLogo';
import { ThreeDBackground } from '@/components/ThreeDBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // The user is created and logged in (if email confirmation is turned off in Supabase)
        navigate('/onboarding');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'login'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-transparent overflow-hidden font-sans selection:bg-indigo-500/30">

      <ThreeDBackground />

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-16">

        {/* Left Info Section */}
        <div className="flex-1 text-center lg:text-left hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold tracking-wide mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            OOMA LABS SECURE NETWORK
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-6 drop-shadow-sm font-sans tracking-tight">
            The Innovation <br /> <span className="text-indigo-400">Pipeline.</span>
          </h1>

          <p className="text-lg text-gray-400 mb-12 max-w-xl leading-relaxed text-left">
            Ooma Workspace is a specialized conceptualization and project management platform. Bridge the gap between ideology, deep research, engineering, and final product launch.
          </p>

          <div className="space-y-6">
            {[
              { icon: <Rocket className="h-6 w-6 text-blue-400" />, title: 'Accelerate Concepts', desc: 'Move ideas rapidly from raw concepts to structured research phases.' },
              { icon: <Workflow className="h-6 w-6 text-indigo-400" />, title: 'Cross-Department Workrooms', desc: 'Secure, dedicated spaces for Innovation, Engineering, and Business teams.' },
              { icon: <PieChart className="h-6 w-6 text-purple-400" />, title: 'Admin Data Center', desc: 'Evaluate and score product viability with 5 key performance metrics.' }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors duration-300">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  {feature.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-white font-semibold text-lg">{feature.title}</h3>
                  <p className="text-gray-400 text-sm mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Section */}
        <div className="w-full max-w-md lg:w-[450px]">
          <div className="bg-white/10 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 relative overflow-hidden">
            {/* Inner subtle glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>

            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <OomaLogo size={64} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {isSignUp ? 'Join Innovation Network' : 'Access Workspace'}
              </h2>
              <p className="text-gray-400 text-sm">
                {isSignUp ? 'Create a secure account with your work email.' : 'Sign in with your team credentials.'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleAuth}>
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-white/30 focus:bg-white/10 transition-all sm:text-sm shadow-inner"
                    placeholder="Work Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-white/30 focus:bg-white/10 transition-all sm:text-sm shadow-inner"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm text-center font-medium">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111827] focus:ring-indigo-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-6"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (isSignUp ? 'Create Profile' : 'Authenticate Securely')}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium border-none bg-transparent"
                >
                  {isSignUp ? 'Already have an account? Sign In' : 'New User? Join the Network'}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-gray-500 text-xs mt-8">
            &copy; {new Date().getFullYear()} Ooma Labs Innovation Group.<br /> All rights reserved. Secure environment.
          </p>
        </div>

      </div>
    </div>
  );
}
