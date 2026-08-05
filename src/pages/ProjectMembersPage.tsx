import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { Search, Bell, Moon, UserPlus, Filter, LayoutGrid, CheckCircle2, MapPin, Briefcase, Network, Code, TrendingUp, ChevronRight, Star, Edit2, Check, X, Lightbulb } from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { OomaLogo } from '@/components/OomaLogo';

import { queryCache } from '@/utils/cache';

export default function ProjectMembersPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editSkills, setEditSkills] = useState('');
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const [viewMode, setViewMode] = useState<'grid' | 'tree'>('grid');

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

  const handleUpdateProfile = async (memberId: string) => {
    if (!user?.workspace_id) return;
    try {
      await adminService.updateUserProfile(
        memberId,
        { full_name: editName, skills: editSkills, location: editLocation },
        user.workspace_id
      );

      setEditingMember(null);
      await fetchMembers();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  useEffect(() => {
    if (!user?.workspace_id) return;

    fetchMembers();

    const dataSubscription = supabase
      .channel(`users_changes_${user.workspace_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `workspace_id=eq.${user.workspace_id}`
        },
        () => {
          queryCache.invalidate(`members_${user.workspace_id}`);
          fetchMembers();
        }
      )
      .subscribe();

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

  // Hide default system admin account from team library if it exists
  const realMembers = members.filter(m => !['admin', 'oomadmin'].includes(m.username?.toLowerCase()));

  // Find CEO strictly from filtered real members list
  const ceo = realMembers.find(m =>
    m.designation?.toLowerCase().includes('ceo') ||
    m.designation?.toLowerCase().includes('founder') ||
    m.role === 'admin'
  );

  // 3 Primary Departments
  const ALL_DEPARTMENTS = [
    'Marketing & Business',
    'Innovation Lab',
    'Engineering Group'
  ];

  const getNormalizedDepartment = (rawDesignation?: string) => {
    if (!rawDesignation) return 'Unassigned';
    const lower = rawDesignation.toLowerCase();
    if (lower.includes('marketing') || lower.includes('business')) return 'Marketing & Business';
    if (lower.includes('innovation')) return 'Innovation Lab';
    return 'Engineering Group';
  };

  const departmentsMap = new Map<string, User[]>();
  ALL_DEPARTMENTS.forEach(dept => departmentsMap.set(dept, []));

  realMembers.forEach(m => {
    if (m.id === ceo?.id) return;

    const normalizedDept = getNormalizedDepartment(m.designation);

    if (!departmentsMap.has(normalizedDept)) {
      departmentsMap.set(normalizedDept, []);
    }
    departmentsMap.get(normalizedDept)!.push(m);
  });

  const sortedDepartments = Array.from(departmentsMap.entries()).sort((a, b) => {
    const indexA = ALL_DEPARTMENTS.indexOf(a[0]);
    const indexB = ALL_DEPARTMENTS.indexOf(b[0]);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });



  const filteredMembers = realMembers.filter((m) => {
    const searchString = `${m.username} ${m.full_name || m.username} ${m.designation || ''} ${m.role || ''} ${m.skills || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    if (activeFilter === 'All') return matchesSearch;

    const userDept = getNormalizedDepartment(m.designation);
    if (activeFilter === userDept) return matchesSearch;

    return false;
  });

  const onlineCount = Array.from(onlineUsers).filter(id => realMembers.some(m => m.id === id)).length;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#09090b]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="flex-1 bg-[#09090b] text-white font-sans min-h-screen overflow-y-auto">
      {/* Header with Ooma Logo and Company Name */}
      <header className="bg-[#09090b]/90 backdrop-blur-md border-b border-[#27272a] px-4 sm:px-8 py-3.5 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center sticky top-0 z-40">
        <div className="flex items-center gap-3 sm:gap-4 justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-[#18181b] border border-[#27272a] rounded-xl flex items-center justify-center shadow-lg hover:border-amber-500/50 transition-all shrink-0">
              <OomaLogo size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black tracking-widest text-amber-400 uppercase">OOMA LABS</span>
                <span className="text-xs text-gray-600 font-bold">•</span>
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">Team Library</h1>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Organization Directory & Hierarchy</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-900 to-[#18181b] flex items-center justify-center border border-indigo-500/30 overflow-hidden relative shadow-lg">
              <span className="text-indigo-400 font-bold text-[10px]">{user?.full_name?.substring(0, 2).toUpperCase() || 'AD'}</span>
              <div className="absolute bottom-0 right-0 h-2 w-2 bg-emerald-500 rounded-full border border-[#18181b]"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative w-full md:w-72 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, role, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-xs sm:text-sm text-white placeholder:text-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              <span className="text-[10px] font-medium text-gray-500 bg-[#27272a] border border-[#3f3f46] rounded px-1.5 py-0.5">Ctrl + K</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 border-2 border-[#09090b] rounded-full"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors">
              <Moon className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
            </button>
            <div className="h-8 w-px bg-[#27272a] mx-1"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white leading-none">{user?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{ceo?.id === user?.id ? 'Founder & CEO' : 'Member'}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-900 to-[#18181b] flex items-center justify-center border border-indigo-500/30 overflow-hidden relative shadow-lg">
                <span className="text-indigo-400 font-bold text-xs">{user?.full_name?.substring(0, 2).toUpperCase() || 'AD'}</span>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border border-[#18181b]"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Mobile-Only Ultra-Compact Single Row */}
        <div className="grid grid-cols-4 gap-1.5 sm:hidden">
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#27272a] shadow-md text-center">
            <p className="text-[9px] text-gray-400 font-medium truncate">Total</p>
            <h3 className="text-xs font-black text-white leading-none mt-1">{realMembers.length}</h3>
          </div>
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#27272a] shadow-md text-center">
            <p className="text-[9px] text-gray-400 font-medium truncate">Online</p>
            <h3 className="text-xs font-black text-emerald-400 leading-none mt-1">{onlineCount}</h3>
          </div>
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#27272a] shadow-md text-center">
            <p className="text-[9px] text-gray-400 font-medium truncate">Depts</p>
            <h3 className="text-xs font-black text-white leading-none mt-1">{sortedDepartments.length}</h3>
          </div>
          <div className="bg-[#18181b] rounded-xl p-2 border border-[#27272a] shadow-md text-center">
            <p className="text-[9px] text-gray-400 font-medium truncate">Experts</p>
            <h3 className="text-xs font-black text-white leading-none mt-1">
              {realMembers.filter(m => (m.skills?.split(',').length || 0) > 3).length}
            </h3>
          </div>
        </div>

        {/* Desktop-Only Original Rich Stats Row */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a] shadow-lg flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <OomaLogo size={20} />
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
                Ooma Labs <ChevronRight className="h-3 w-3" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 font-medium">Total Members</p>
              <h3 className="text-3xl font-bold text-white mt-1">{realMembers.length}</h3>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a] shadow-lg flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <div className="h-5 w-5 flex items-center justify-center relative">
                  <div className="absolute h-3 w-3 bg-emerald-400 rounded-full"></div>
                  <div className="absolute h-3 w-3 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-400 bg-[#27272a] border border-[#3f3f46] px-2 py-1 rounded-full">
                {Math.round((onlineCount / (realMembers.length || 1)) * 100)}% active
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 font-medium">Online Now</p>
              <h3 className="text-3xl font-bold text-white mt-1">{onlineCount}</h3>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a] shadow-lg flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-purple-800 border-2 border-[#18181b]"></div>
                <div className="h-6 w-6 rounded-full bg-emerald-700 border-2 border-[#18181b]"></div>
                <div className="h-6 w-6 rounded-full bg-blue-600 border-2 border-[#18181b]"></div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 font-medium">Departments</p>
              <h3 className="text-3xl font-bold text-white mt-1">{sortedDepartments.length}</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium truncate">{sortedDepartments.map(d => d[0]).join(' • ')}</p>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-5 border border-[#27272a] shadow-lg flex flex-col justify-between hover:border-[#3f3f46] transition-colors">
            <div className="flex items-start justify-between">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Star className="h-5 w-5 fill-amber-500/50" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 bg-[#27272a] border border-[#3f3f46] px-2 py-1 rounded-full">
                Skills Registry
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-400 font-medium">Experts</p>
              <h3 className="text-3xl font-bold text-white mt-1">
                {realMembers.filter(m => (m.skills?.split(',').length || 0) > 3).length}
              </h3>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
            {['All', ...sortedDepartments.map(d => d[0])].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500'
                    : 'bg-[#18181b] border border-[#27272a] text-gray-400 hover:bg-[#27272a] hover:text-white'
                  }`}
              >
                {filter} {filter !== 'All' && <span className="ml-1 opacity-70 bg-black/30 px-1.5 py-0.5 rounded text-[10px]">{
                  sortedDepartments.find(d => d[0] === filter)?.[1].length || 0
                }</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <div className="flex bg-[#18181b] border border-[#27272a] rounded-lg p-1 shadow-lg">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-500 hover:text-white hover:bg-[#27272a]'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                title="Hierarchy Tree View"
                className={`p-1.5 rounded transition-colors ${viewMode === 'tree' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-500 hover:text-white hover:bg-[#27272a]'}`}
              >
                <Network className="h-4 w-4" />
              </button>
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-[#18181b] border border-[#27272a] rounded-lg text-xs sm:text-sm font-medium text-gray-300 hover:bg-[#27272a] transition-colors shadow-lg">
              <Filter className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-gray-400" />
              Filter
            </button>
          </div>
        </div>

        {viewMode === 'grid' && (
          <>
            {/* Team Members Section Header */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Team Members</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Discover the talented people behind Ooma Labs</p>
            </div>

            {/* Member Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredMembers.map(member => {
            const isOnline = onlineUsers.has(member.id);
            const skills = member.skills ? member.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
            const isCeo = member.id === ceo?.id;
            const isOwnProfile = user?.id === member.id;
            const isEditing = isOwnProfile && editingMember === member.id;

            const dept = getNormalizedDepartment(member.designation);
            // Default theme
            let theme = {
              cardBg: 'bg-gradient-to-b from-[#1c1917]/90 via-[#18181b] to-[#09090b]',
              border: 'border-amber-500/30 hover:border-amber-500/70 hover:shadow-amber-500/10',
              avatarBg: 'from-amber-400 via-amber-500 to-orange-600',
              avatarText: 'text-amber-950 font-black',
              badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
              accent: 'text-amber-400',
              btn: 'hover:bg-amber-500 hover:border-amber-400'
            };

            if (isCeo) {
              // Vibrant Yellow & Warm Orange Shaded Theme for CEO
              theme = {
                cardBg: 'bg-gradient-to-b from-amber-950/60 via-[#1c1917] to-[#09090b]',
                border: 'border-amber-500/60 hover:border-amber-400 hover:shadow-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                avatarBg: 'from-yellow-400 via-amber-500 to-orange-600',
                avatarText: 'text-[#1c1917] font-black',
                badge: 'bg-amber-500/20 text-yellow-300 border-amber-500/40 shadow-inner',
                accent: 'text-yellow-400',
                btn: 'bg-amber-500/20 border-amber-500/40 hover:bg-amber-500 hover:text-black hover:border-amber-400'
              };
            } else if (dept === 'Marketing & Business') {
              theme = {
                cardBg: 'bg-gradient-to-b from-lime-950/50 via-[#18181b] to-[#09090b]',
                border: 'border-lime-500/30 hover:border-lime-400 hover:shadow-lime-500/10',
                avatarBg: 'from-lime-500 via-emerald-500 to-green-600',
                avatarText: 'text-lime-950 font-black',
                badge: 'bg-lime-500/10 text-lime-300 border-lime-500/30',
                accent: 'text-lime-400',
                btn: 'hover:bg-lime-600 hover:border-lime-500'
              };
            } else if (dept === 'Innovation Lab') {
              theme = {
                cardBg: 'bg-gradient-to-b from-emerald-950/40 via-[#18181b] to-[#09090b]',
                border: 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-emerald-500/10',
                avatarBg: 'from-emerald-600 via-teal-600 to-emerald-800',
                avatarText: 'text-emerald-100',
                badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
                accent: 'text-emerald-400',
                btn: 'hover:bg-emerald-600 hover:border-emerald-500'
              };
            } else if (dept === 'Engineering Group') {
              theme = {
                cardBg: 'bg-gradient-to-b from-slate-900/80 via-[#18181b] to-[#09090b]',
                border: 'border-slate-400/40 hover:border-slate-200 hover:shadow-slate-400/10',
                avatarBg: 'from-slate-200 via-slate-400 to-zinc-600',
                avatarText: 'text-slate-950 font-black',
                badge: 'bg-slate-400/10 text-slate-200 border-slate-400/30',
                accent: 'text-slate-300',
                btn: 'hover:bg-slate-200 hover:text-black hover:border-white'
              };
            }

            return (
              <div key={member.id} className="contents">
                {/* Mobile Smart Compact Profile Card */}
                <div className={`sm:hidden ${theme.cardBg} rounded-2xl p-4 border ${theme.border} shadow-xl relative overflow-hidden backdrop-blur-xl transition-all active:scale-[0.99]`}>
                  {/* Glowing background aura */}
                  <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/5 blur-xl pointer-events-none"></div>

                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${theme.avatarBg} border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-lg`}>
                      <span className={`text-base font-black ${theme.avatarText} tracking-tighter`}>
                        {member.full_name?.substring(0, 2).toUpperCase() || member.username?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Member Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-white tracking-tight truncate">{member.full_name || member.username}</h3>
                        <CheckCircle2 className={`h-3.5 w-3.5 ${theme.accent} shrink-0`} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                          {isCeo ? 'Founder & CEO' : (member.designation || 'Member')}
                        </span>
                      </div>
                    </div>

                    {/* Status & Quick Edit */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                        <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">{isOnline ? 'Active' : 'Offline'}</span>
                      </div>
                      {isOwnProfile && !isEditing && (
                        <button
                          onClick={() => {
                            setEditingMember(member.id);
                            setEditName(member.full_name || '');
                            setEditSkills(member.skills || '');
                            setEditLocation(member.location || '');
                          }}
                          className="p-1 text-indigo-400 hover:text-white bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] flex items-center gap-1 font-bold"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & Skills on Mobile */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-gray-400 text-[10px] font-medium">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Location..."
                          className="w-24 bg-[#09090b] border border-indigo-500/50 rounded-lg px-2 py-1 text-xs text-white"
                        />
                      ) : (
                        <span>{member.location || 'Hyderabad'}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="w-full flex flex-col gap-2 mt-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name..."
                          className="w-full bg-[#09090b] border border-indigo-500/50 rounded-lg px-2 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={editSkills}
                          onChange={(e) => setEditSkills(e.target.value)}
                          placeholder="Skills (comma separated)..."
                          className="w-full bg-[#09090b] border border-indigo-500/50 rounded-lg px-2 py-1 text-xs text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateProfile(member.id)}
                            className="flex-1 bg-indigo-600 text-white py-1 rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="px-3 bg-gray-800 text-gray-300 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {skills.map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] font-medium text-gray-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Full 3D Profile Card */}
                <div className={`hidden sm:flex ${theme.cardBg} rounded-[24px] p-6 border ${theme.border} shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex-col relative group overflow-hidden backdrop-blur-xl`}>
                  
                  {/* Subtle Glow aura behind avatar */}
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>

                  {/* Online Badge & Edit Toggle */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    {isOwnProfile && !isEditing && (
                      <button
                        onClick={() => {
                          setEditingMember(member.id);
                          setEditName(member.full_name || '');
                          setEditSkills(member.skills || '');
                          setEditLocation(member.location || '');
                        }}
                        className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors backdrop-blur-md"
                        title="Update Profile"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-sm">
                      <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-gray-500'}`}></div>
                      <span className="text-[10px] font-bold tracking-wider text-gray-300 uppercase">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* Avatar & Info */}
                  <div className="flex flex-col items-center mt-2 mb-5">
                    <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${theme.avatarBg} border-2 border-white/20 flex items-center justify-center overflow-hidden mb-3.5 relative group-hover:scale-105 transition-transform duration-300 shadow-xl`}>
                      <span className={`text-2xl font-black ${theme.avatarText} tracking-tighter drop-shadow-md`}>
                        {member.full_name?.substring(0, 2).toUpperCase() || member.username?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="w-full px-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Update Name..."
                          className="w-full text-center bg-[#09090b] border border-indigo-500/50 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="text-base font-extrabold text-white tracking-tight">{member.full_name || member.username}</h3>
                        <CheckCircle2 className={`h-4 w-4 ${theme.accent}`} />
                      </div>
                    )}

                    {/* Clean Designation Badge */}
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${theme.badge} mt-0.5`}>
                      {isCeo ? 'Founder & CEO' : (member.designation || 'Member')}
                    </span>

                    <div className="flex items-center gap-1 mt-2.5 text-gray-400">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="Update Location..."
                          className="w-24 bg-[#09090b] border border-indigo-500/50 rounded text-[10px] px-1 py-0.5 text-center text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-[11px] font-medium">{member.location || 'Hyderabad'}</span>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                    {isEditing ? (
                      <div className="w-full flex flex-col items-center gap-2 px-2">
                        <input
                          type="text"
                          value={editSkills}
                          onChange={(e) => setEditSkills(e.target.value)}
                          placeholder="e.g. React, Node, Design..."
                          className="w-full text-center bg-[#09090b] border border-indigo-500/50 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => handleUpdateProfile(member.id)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="px-3 bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 rounded-lg transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {skills.map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-semibold text-gray-300 backdrop-blur-md shadow-sm transition-colors">
                            {skill}
                          </span>
                        ))}
                        {skills.length === 0 && (
                          <span className="text-[10px] text-gray-500 italic font-medium px-3 py-1 border border-dashed border-gray-700 rounded-full">Update Skills</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-auto"></div>

                  {/* Action Button */}
                  <button className={`w-full py-2.5 bg-white/5 border border-white/10 ${theme.btn} text-white rounded-xl text-xs font-bold shadow-md transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-md`}>
                    View Profile <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

              {/* Invite New Member Card */}
              <div className="bg-[#18181b] rounded-[20px] p-6 border-2 border-dashed border-[#3f3f46] flex flex-col items-center justify-center text-center hover:bg-[#27272a] hover:border-indigo-500/50 transition-colors cursor-pointer group min-h-[380px]">
                <div className="h-16 w-16 bg-[#27272a] rounded-full flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Invite New Member</h3>
                <p className="text-xs text-gray-500 mb-6 max-w-[200px]">Grow your team and build great things together</p>
                <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" /> Invite Member
                </button>
              </div>
            </div>
          </>
        )}

        {viewMode === 'tree' && (
          <div className="mt-4 bg-[#18181b] rounded-2xl p-4 sm:p-8 border border-[#27272a] shadow-xl overflow-x-auto custom-scrollbar">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 sticky left-0 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest">OOMA LABS</span>
                  <span className="text-xs text-gray-500">•</span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Organization Hierarchy</h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Structured departments and leadership architecture</p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full sm:hidden">
                ↔ Swipe to view tree
              </span>
            </div>

            <div className="min-w-[900px] flex flex-col items-center pt-4">

              {/* Top Node - Founder & CEO directly */}
              <div className="bg-[#18181b] border-2 border-amber-500/50 rounded-2xl py-3 px-6 shadow-2xl flex items-center gap-4 z-10 relative hover:border-amber-400 transition-colors">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-indigo-600 border border-amber-400 flex items-center justify-center text-white font-black text-sm shadow-inner">
                  {ceo?.full_name?.substring(0, 2).toUpperCase() || ceo?.username?.substring(0, 2).toUpperCase() || 'AK'}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-extrabold text-white">
                    {ceo?.full_name || ceo?.username || 'Ajay Kumar'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Founder & CEO
                  </span>
                </div>
              </div>

              {/* Main Vertical Connector */}
              <div className="w-px h-8 bg-[#3f3f46]"></div>

              {/* Horizontal Connector line */}
              <div className="w-[94%] h-px bg-[#3f3f46]"></div>

              {/* Branches to All Departments */}
              <div className="w-[94%] flex justify-around relative mt-[-1px]">

                {sortedDepartments.map(([deptName, teamMembers]) => {
                  let colorClasses = 'bg-gray-900/40 border-gray-500/30 text-gray-400';
                  let textClasses = 'text-gray-300';
                  let Icon = Briefcase;

                  // Department color scheme mapping for Tree View tiles
                  let deptTheme = {
                    cardBg: 'bg-[#18181b] border-[#3f3f46]',
                    avatarBg: 'from-gray-700 to-gray-900 text-gray-300 border-gray-600',
                    leadBg: 'bg-gradient-to-r from-amber-950/60 to-[#18181b] border-amber-500/40',
                    leadAvatar: 'from-yellow-400 via-amber-500 to-orange-600 text-amber-950',
                    managerBg: 'bg-gradient-to-r from-indigo-950/50 to-[#18181b] border-indigo-500/40',
                    managerAvatar: 'from-indigo-500 to-purple-600 text-white',
                    memberBg: 'bg-[#18181b] border-[#3f3f46]',
                    memberAvatar: 'from-gray-600 to-gray-800 text-gray-200'
                  };

                  if (deptName === 'Marketing & Business') {
                    colorClasses = 'bg-lime-900/30 border-lime-500/40';
                    textClasses = 'text-lime-300';
                    Icon = TrendingUp;
                    deptTheme.memberBg = 'bg-gradient-to-r from-lime-950/40 to-[#18181b] border-lime-500/30';
                    deptTheme.memberAvatar = 'from-lime-500 via-emerald-500 to-green-600 text-lime-950 font-black border-lime-400/40';
                  } else if (deptName === 'Innovation Lab') {
                    colorClasses = 'bg-emerald-900/30 border-emerald-500/40';
                    textClasses = 'text-emerald-300';
                    Icon = Lightbulb;
                    deptTheme.memberBg = 'bg-gradient-to-r from-emerald-950/40 to-[#18181b] border-emerald-500/30';
                    deptTheme.memberAvatar = 'from-emerald-500 via-teal-600 to-emerald-700 text-emerald-100 border-emerald-400/40';
                  } else if (deptName === 'Engineering Group') {
                    colorClasses = 'bg-slate-800/40 border-slate-400/40';
                    textClasses = 'text-slate-200';
                    Icon = Code;
                    deptTheme.memberBg = 'bg-gradient-to-r from-slate-900/60 to-[#18181b] border-slate-500/30';
                    deptTheme.memberAvatar = 'from-slate-200 via-slate-400 to-zinc-600 text-slate-950 border-slate-300 font-black';
                  }



                  // Sub-tier grouping for Lead, Manager, and Team Members
                  const leads = teamMembers.filter(m => {
                    const d = (m.designation || '').toLowerCase();
                    return d.includes('lead') || d.includes('head') || d.includes('vp') || d.includes('director') || d.includes('chief');
                  });

                  const managers = teamMembers.filter(m => {
                    const d = (m.designation || '').toLowerCase();
                    const isLead = d.includes('lead') || d.includes('head') || d.includes('vp') || d.includes('director') || d.includes('chief');
                    return !isLead && (d.includes('manager') || d.includes('supervisor') || d.includes('principal'));
                  });

                  const membersOnly = teamMembers.filter(m => !leads.includes(m) && !managers.includes(m));

                  return (
                    <div key={deptName} className="flex flex-col items-center flex-1 min-w-[210px] px-2">
                      <div className="w-px h-8 bg-[#3f3f46]"></div>
                      <div className={`${colorClasses} border rounded-xl py-2 px-4 flex items-center gap-2 mb-6 shadow-md backdrop-blur-md`}>
                        <Icon className="h-4 w-4" />
                        <span className={`text-[11px] font-extrabold ${textClasses} uppercase tracking-wider whitespace-nowrap`}>{deptName}</span>
                      </div>

                      <div className="flex flex-col items-center w-full space-y-4">
                        {/* 1. Team Lead Level */}
                        {leads.length > 0 && (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shadow-sm">
                              Team Lead / Head
                            </span>
                            <div className="flex flex-col gap-2 w-full items-center">
                              {leads.map(m => (
                                <div key={m.id} className={`${deptTheme.leadBg} border-2 rounded-xl p-2.5 shadow-xl flex items-center gap-3 w-full max-w-[190px] hover:-translate-y-0.5 transition-all`}>
                                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${deptTheme.leadAvatar} border border-amber-300 flex shrink-0 items-center justify-center font-black text-xs relative shadow-md`}>
                                    {m.full_name?.substring(0, 2).toUpperCase() || m.username?.substring(0, 2).toUpperCase()}
                                    <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#18181b] ${onlineUsers.has(m.id) ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white truncate block w-full">{m.full_name?.split(' ')[0] || m.username}</span>
                                    <span className="text-[9px] text-amber-300 font-semibold truncate block w-full" title={m.designation}>{m.designation || 'Team Lead'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Connector line between Lead and Manager if both exist */}
                        {leads.length > 0 && managers.length > 0 && (
                          <div className="w-px h-4 bg-[#3f3f46]"></div>
                        )}

                        {/* 2. Manager Level */}
                        {managers.length > 0 && (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shadow-sm">
                              Manager / Senior
                            </span>
                            <div className="flex flex-col gap-2 w-full items-center">
                              {managers.map(m => (
                                <div key={m.id} className={`${deptTheme.managerBg} border rounded-xl p-2.5 shadow-lg flex items-center gap-3 w-full max-w-[190px] hover:-translate-y-0.5 transition-all`}>
                                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${deptTheme.managerAvatar} border border-indigo-400 flex shrink-0 items-center justify-center text-xs font-black relative shadow-md`}>
                                    {m.full_name?.substring(0, 2).toUpperCase() || m.username?.substring(0, 2).toUpperCase()}
                                    <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#18181b] ${onlineUsers.has(m.id) ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-gray-100 truncate block w-full">{m.full_name?.split(' ')[0] || m.username}</span>
                                    <span className="text-[9px] text-indigo-300 font-semibold truncate block w-full" title={m.designation}>{m.designation || 'Manager'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Connector line between Manager/Lead and Members if Members exist */}
                        {(leads.length > 0 || managers.length > 0) && membersOnly.length > 0 && (
                          <div className="w-px h-4 bg-[#3f3f46]"></div>
                        )}

                        {/* 3. Team Members Level */}
                        {membersOnly.length > 0 && (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 bg-[#27272a] px-2 py-0.5 rounded border border-[#3f3f46]">
                              Team Members ({membersOnly.length})
                            </span>
                            <div className="flex flex-col gap-2 w-full items-center">
                              {membersOnly.map(m => (
                                <div key={m.id} className={`${deptTheme.memberBg} border rounded-xl p-2.5 shadow-md flex items-center gap-3 w-full max-w-[190px] hover:-translate-y-0.5 transition-all`}>
                                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${deptTheme.memberAvatar} border flex shrink-0 items-center justify-center text-xs font-black relative shadow-inner`}>
                                    {m.full_name?.substring(0, 2).toUpperCase() || m.username?.substring(0, 2).toUpperCase()}
                                    <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#27272a] ${onlineUsers.has(m.id) ? 'bg-emerald-400' : 'bg-gray-500'}`}></div>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-gray-200 truncate block w-full">{m.full_name?.split(' ')[0] || m.username}</span>
                                    <span className="text-[9px] text-gray-400 truncate block w-full" title={m.designation}>{m.designation || 'Member'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fallback if entire department is empty */}
                        {teamMembers.length === 0 && (
                          <div className="border border-dashed border-[#3f3f46] rounded-xl p-3 text-center w-full max-w-[190px]">
                            <span className="text-[10px] text-gray-500 font-medium italic">Department Open</span>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        )}
      </main>

      
    </div>
  );
}
