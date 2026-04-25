import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { ChevronLeft, Users, Briefcase, Shield, Search, Edit2, Check, X, Star, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OomaLogo } from '@/components/OomaLogo';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export default function ProjectMembersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  
  const [members, setMembers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editSkills, setEditSkills] = useState('');

  const handleUpdateSkills = async (memberId: string) => {
    try {
      await adminService.updateUserProfile(memberId, { 
        skills: editSkills
      });
      setEditingMember(null);
      fetchMembers();
      toast.success('Skills updated successfully');
    } catch (err) {
      toast.error('Failed to update skills');
    }
  };

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

  useEffect(() => {
    if (!user?.workspace_id) return;

    fetchMembers();

    // 1. Data Changes Subscription
    const dataSubscription = supabase
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
          fetchMembers();
        }
      )
      .subscribe();

    // 2. Real-time Presence Tracking
    const presenceChannel = supabase.channel(`presence_${user.workspace_id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(dataSubscription);
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.workspace_id, user?.id]);

  const filteredMembers = members.filter((m) => {
    const searchString = `${m.username} ${m.full_name || m.username} ${m.designation || ''} ${m.role || ''} ${m.skills || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030305] z-50">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full animate-pulse"></div>
        <OomaLogo className="text-white relative z-10" size={64} />
        <div className="mt-8 flex flex-col items-center">
          <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
             <div className="w-1/2 h-full bg-indigo-500 animate-[loading_1.5s_infinite_ease-in-out]"></div>
          </div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-4 animate-pulse">Synchronizing Personnel</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030305] text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Dynamic Background Elements */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
      
      {/* Premium Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070709]/80 backdrop-blur-2xl border-b border-white/5 h-20 shrink-0 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')} 
            className="group p-3 bg-white/5 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-90 transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Users className="h-5 w-5 text-indigo-400" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">Team Library</h1>
            </div>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1 ml-1">Universal Registry // Workspace v2.0</p>
          </div>
        </div>

        <div className="relative w-full max-w-[300px] hidden lg:block group">
          <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors z-10" />
          <input 
            type="text" 
            placeholder="Search by name, role, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="relative w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
          />
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex flex-col items-end mr-2">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Members</span>
             <span className="text-xl font-black text-white leading-none">{members.length}</span>
           </div>
           <OomaLogo size={32} className="opacity-80 hover:opacity-100 transition-opacity" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-32 px-6 md:px-12 pb-24 custom-scrollbar relative z-10">
        <div className="max-w-[1400px] mx-auto">
          
          {/* Mobile Search */}
          <div className="lg:hidden mb-10 group relative">
             <div className="absolute inset-0 bg-indigo-500/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors z-10" />
             <input 
              type="text" 
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredMembers.map(member => {
              const isOnline = onlineUsers.has(member.id);
              
              return (
                <div key={member.id} className="group relative">
                  {/* Background Glow */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                  
                  <div className="relative h-full bg-[#0a0a0c]/80 backdrop-blur-3xl rounded-[2rem] border border-white/5 p-8 flex flex-col transition-all duration-500 group-hover:-translate-y-2 group-hover:border-white/20 group-hover:bg-[#0c0c0e]">
                    
                    {/* Card Header: Avatar & Basic Info */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex gap-5">
                        <div className="relative">
                          <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br from-[#1e1e2d] to-[#0a0a0c] border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group/avatar`}>
                             <div className="absolute inset-0 bg-indigo-500/0 group-hover/avatar:bg-indigo-500/10 transition-colors duration-500"></div>
                             <span className="text-white font-black text-3xl tracking-tighter transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">{member.username.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 h-5 w-5 bg-[#030305] rounded-full p-1 border border-white/10`}>
                             <div className={`h-full w-full rounded-full transition-all duration-500 ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-700'}`}></div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-center">
                          <h3 className="text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-indigo-300 transition-colors">{member.full_name || member.username}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-gray-500 tracking-wider">@{member.username}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                            <span className="text-[10px] font-black text-indigo-400/70 uppercase tracking-widest">{member.role === 'admin' ? 'Admin' : 'Partner / Member'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit Button for own skills */}
                      {user?.id === member.id && editingMember !== member.id && (
                        <button 
                          onClick={() => { 
                            setEditingMember(member.id); 
                            setEditSkills(member.skills || '');
                          }} 
                          className="p-3 bg-white/5 border border-white/10 text-gray-500 rounded-2xl hover:bg-indigo-500 hover:text-white hover:border-indigo-400 transition-all active:scale-90"
                          title="Modify Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Online Status Label */}
                    <div className="mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-white/5 transition-all ${isOnline ? 'text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-gray-600 opacity-60'}`}>
                         <div className={`h-1 w-1 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`}></div>
                         <span className="text-[8px] font-black uppercase tracking-[0.2em]">{isOnline ? 'Active Session' : 'Offline'}</span>
                      </div>
                    </div>

                    {/* Departments Section */}
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-3 w-3 text-gray-600" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Department Alignment</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.designation ? member.designation.split(', ').map((dept, i) => (
                          <div key={i} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-md transition-all group/tag
                            ${dept.includes('Innovation') ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20' : 
                              dept.includes('Business') ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20' : 
                              dept.includes('Developer') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20' : 'bg-white/5 border-white/10 text-gray-400'}
                          `}>
                            {dept.replace(' Team', '')}
                          </div>
                        )) : (
                          <span className="text-[10px] text-gray-700 italic font-bold">Unassigned</span>
                        )}
                      </div>
                    </div>

                    {/* Skills & Expertise Section */}
                    <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-indigo-400" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Core Expertise</span>
                        </div>
                      </div>

                      {editingMember === member.id ? (
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            value={editSkills}
                            onChange={(e) => setEditSkills(e.target.value)}
                            className="w-full bg-black/60 border border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none ring-2 ring-indigo-500/10"
                            placeholder="e.g. UX Design, React, Strategy..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateSkills(member.id)}
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                              <Check className="h-3 w-3" /> Save Changes
                            </button>
                            <button 
                              onClick={() => setEditingMember(null)}
                              className="px-4 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {member.skills ? member.skills.split(',').map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[10px] text-gray-300 font-bold tracking-wide hover:bg-white/10 transition-colors">
                              {skill.trim()}
                            </span>
                          )) : (
                            <span className="text-[10px] text-gray-600 font-bold italic">No skills documented.</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Directory Access</span>
                        <span className="text-[10px] font-mono text-gray-400">ID-{member.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                      <button className="p-2 text-gray-600 hover:text-white transition-colors" title="View Extended Profile">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="py-32 text-center relative overflow-hidden rounded-[3rem] bg-white/[0.01] border border-dashed border-white/10">
              <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full animate-pulse"></div>
              <div className="relative z-10">
                <Search className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-gray-500 uppercase tracking-tighter">Zero Results Found</h3>
                <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto font-medium">We couldn't find any personnel matching your current search parameters.</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all active:scale-95"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
}
