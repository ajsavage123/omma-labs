import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { ChevronLeft, Users, Briefcase, Shield, Search, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OomaLogo } from '@/components/OomaLogo';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export default function ProjectMembersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.workspace_id) {
      fetchMembers();

      // Subscribe to real-time changes on the 'users' table
      const subscription = supabase
        .channel('users_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            filter: `workspace_id=eq.${user.workspace_id}`
          },
          () => {
            fetchMembers(); // Refetch when a change occurs
          }
        )
        .subscribe();

      // Cleanup subscription when component unmounts
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user?.workspace_id]);

  const fetchMembers = async () => {
    if (!user?.workspace_id) return;
    try {
      const data = await adminService.getTeamMembers(user.workspace_id);
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const searchString = `${m.username} ${m.full_name || ''} ${m.designation} ${m.role}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-50">
      <div className="text-center">
        <OomaLogo className="text-[#6366f1] animate-pulse" size={48} />
        <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mt-4">Accessing Directory...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#6366f1]/30 overflow-hidden flex flex-col">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 shrink-0 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 active:scale-90 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="hidden sm:block h-8 w-[1px] bg-white/5 mx-2"></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <h1 className="text-[14px] md:text-lg font-black text-white uppercase tracking-tight">Team Library</h1>
            </div>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Ooma Personnel Directory</p>
          </div>
        </div>

        <div className="relative w-full max-w-[200px] md:max-w-xs hidden sm:block group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search colleagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0d] border border-white/20 rounded-2xl text-[13px] outline-none focus:border-indigo-500/50 transition-all font-bold text-white placeholder:text-gray-600 shadow-inner"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-24 px-4 md:px-10 pb-20 custom-scrollbar mt-4">
        <div className="max-w-7xl mx-auto w-full">
          <div className="sm:hidden mb-6 group">
             <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search colleagues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0a0a0d] border border-white/20 rounded-2xl text-[13px] outline-none focus:border-indigo-500/50 transition-all font-bold text-white placeholder:text-gray-600 shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => (
              <div key={member.id} className="group relative overflow-hidden bg-[#0c0c0e] rounded-[32px] border border-white/5 p-6 hover:border-indigo-500/30 transition-all duration-500 shadow-xl flex flex-col">
                <div className="absolute top-0 right-0 p-4">
                   <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 shadow-inner">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Online</span>
                   </div>
                </div>
                
                <div className="flex items-center gap-5 mb-8">
                  <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-600/20">
                     <div className="h-full w-full bg-[#0c0c0e] rounded-[22px] flex items-center justify-center text-xl font-bold text-white uppercase">
                        {member.username.substring(0,2)}
                     </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{member.full_name || member.username}</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{member.username}</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                     <Briefcase className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                     <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Department</p>
                        <p className="text-[11px] font-bold text-gray-200 leading-tight">{member.designation}</p>
                     </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                     <Globe className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                     <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">E-Mail Address</p>
                        <p className="text-[11px] font-bold text-gray-200 leading-tight truncate max-w-[180px]">{(member as any).email || (member.username + '@gmail.com')}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                     <Shield className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                     <div>
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Platform Role</p>
                        <p className="text-[11px] font-bold text-indigo-300 leading-tight uppercase tracking-wider">{member.role}</p>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Search className="h-8 w-8 text-gray-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-600 uppercase tracking-widest">No members found</h3>
              <p className="text-gray-700 text-sm mt-2">Adjust your search query and try again.</p>
            </div>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #11111d;
          border-radius: 20px;
          border: 2px solid #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #1a1a2e;
        }
      `}</style>
    </div>
  );
}
