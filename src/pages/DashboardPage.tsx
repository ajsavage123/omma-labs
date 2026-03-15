import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, LayoutDashboard, LogOut, Settings, Search, Filter, MessageCircle, Clock, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'rejected'>('all');

  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [projectsData, logsData] = await Promise.all([
        projectService.getProjects(),
        projectService.getTimelineLogs()
      ]);
      setProjects(projectsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    try {
      await projectService.createProject(newName, newDesc, newLink, newMembers, user.id);
      setIsModalOpen(false);
      setNewName(''); setNewMembers(''); setNewDesc(''); setNewLink('');
      fetchData();
    } catch (error) { console.error('Error creating project:', error); }
    finally { setCreating(false); }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6366f1]"></div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border-[2.5px] border-[#6366f1] flex items-center justify-center relative">
             <div className="h-1.5 w-1.5 bg-[#6366f1] rounded-full"></div>
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight">Ooma Workspace</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#6366f1]">Ooma Workflow</p>
          </div>
        </div>
        <button className="md:hidden p-2 text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="mt-6 px-3 space-y-1.5 flex-1">
        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold rounded-xl bg-[#14142d] text-[#818cf8] border border-white/5 group">
          <LayoutDashboard className="mr-3 h-4 w-4 text-[#ec4899]" />
          Dashboard
        </Link>
        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-500 rounded-xl hover:bg-white/[0.02] transition-colors">
          <Settings className="mr-3 h-4 w-4 text-[#a855f7]" />
          Admin Panel
        </Link>
      </nav>

      <div className="p-4 mt-auto space-y-3">
        <div className="flex items-center p-3 rounded-2xl bg-[#11111d] border border-white/5">
          <div className="h-9 w-9 rounded-full bg-[#1c1c3c] border border-[#6366f1]/40 flex items-center justify-center font-bold text-[#818cf8] text-[10px]">
             {user?.username?.substring(0,2).toUpperCase() || 'AD'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.username || 'Ooma Admin'}</p>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider truncate">{user?.designation || 'Innovation Team'}</p>
          </div>
        </div>
        <button onClick={() => signOut()} className="w-full py-2.5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#f97316] rounded-xl border border-[#f97316]/20 bg-[#f97316]/5 hover:bg-[#f97316]/10 transition-all">
          <LogOut className="mr-2 h-3 w-3" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#080808] text-white font-sans selection:bg-[#6366f1]/30 overflow-x-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-[250px] flex-shrink-0 flex-col bg-[#0c0c0e] border-r border-white/5 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0c0c0e] border-b border-white/5 sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full border-2 border-[#6366f1] flex items-center justify-center">
             <div className="h-1 w-1 bg-[#6366f1] rounded-full"></div>
          </div>
          <span className="text-sm font-black tracking-tight uppercase">Ooma Workspace</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white/5 rounded-lg border border-white/10">
          <Menu className="h-6 w-6 text-gray-400" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/95 z-[70] md:hidden">
           <SidebarContent />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1300px] mx-auto p-6 md:p-10">
          
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome back, <span className="text-white">{user?.username || 'Ooma'}</span>
              </h2>
              <p className="text-xs md:text-sm mt-1 text-gray-500 font-bold">
                You are currently monitoring the <span className="text-white">Ooma Workflow</span>
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 rounded-[16px] bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-bold text-[10px] md:text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Create Project
            </button>
          </div>

          {/* Search bar row */}
           <div className="flex flex-col xl:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#f59e0b]" />
              <input
                type="text"
                placeholder="Search projects or team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-[#11111d] border border-white/5 rounded-2xl text-[14px] outline-none focus:border-[#6366f1]/30 transition-all font-medium"
              />
              <Filter className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#10b981]" />
            </div>
            <div className="flex overflow-x-auto pb-2 xl:pb-0 gap-2 scrollbar-hide">
              {['all', 'active', 'completed', 'rejected'].map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status as any)} 
                  className={`px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === status ? 'bg-[#5051ca] text-white shadow-lg shadow-[#6366f1]/20' : 'bg-[#18181e] text-gray-500'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Main Grid: Projects & Activity */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
            
            {/* Project List */}
            <div className="xl:col-span-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              {filteredProjects.length === 0 && (
                <div className="py-20 text-center text-gray-700 font-bold uppercase tracking-widest text-xs">No projects found</div>
              )}
            </div>

            {/* Global Activity Sidebar */}
            <div className="xl:col-span-1">
              <div className="rounded-[32px] bg-[#11111d] border border-white/5 overflow-hidden sticky top-8">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <h3 className="font-bold text-[10px] md:text-[11px] uppercase tracking-widest flex items-center gap-2">
                     <Clock className="h-4 w-4 text-[#6366f1]" strokeWidth={3} />
                     Global Activity
                   </h3>
                   <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-black text-gray-600">{logs.length}</span>
                </div>
                <div className="max-h-[500px] overflow-y-auto p-3 space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 rounded-2xl hover:bg-white/[0.02] transition-colors relative border border-transparent hover:border-white/5">
                       <div className="flex items-start gap-4">
                         <div className="h-1.5 w-4 bg-[#6366f1] rounded-full mt-2 flex-shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                         <div>
                            <p className="text-[12px] leading-relaxed">
                              <span className="font-extrabold text-[#818cf8]">{log.user_name}</span>{" "}
                              <span className="text-gray-400 font-semibold">{log.update_text}</span>
                            </p>
                            <p className="text-[9px] font-black text-gray-700 mt-2 uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Chat Bubble */}
      <button className="fixed bottom-6 right-6 md:bottom-10 md:right-10 h-14 w-14 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(99,102,241,0.4)] hover:scale-110 active:scale-95 transition-all z-[50]">
        <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {/* Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-[#11111d] rounded-[32px] border border-white/10 w-full max-w-md p-8 sm:p-10 shadow-3xl">
            <h3 className="text-2xl font-black mb-2 tracking-tight">Create Project</h3>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-10">Launch a new innovation workspace.</p>
            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-700 ml-1">Workspace Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Project Hyperdrive" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-[#6366f1]/50 text-sm font-semibold" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-700 ml-1">Objectives</label>
                <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What are we building?" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-[#6366f1]/50 h-32 text-sm font-semibold resize-none" />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">Cancel</button>
                <button disabled={creating} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-[#6366f1] text-white rounded-2xl shadow-lg shadow-[#6366f1]/20 hover:bg-[#4f46e5] transition-all disabled:opacity-50">
                  {creating ? 'Launching...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
