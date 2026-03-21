import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import { adminService } from '@/services/adminService';
import type { Project, ProjectStage, TimelineLog } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { OomaLogo } from '@/components/OomaLogo';
import { Plus, LayoutDashboard, LogOut, Settings, Search, Filter, Menu, X, Trash2, History, Lightbulb, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type StatusFilter = 'all' | 'active' | 'completed' | 'rejected';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Search + filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Form State
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { 
    fetchData(); 
    projectService.cleanupOldMessages();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsData, logsData] = await Promise.all([
        projectService.getProjects(),
        projectService.getTimelineLogs()
      ]);
      setProjects(projectsData);
      setLogs(logsData);
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.workspace_id) return;
    
    setCreating(true);
    const creationToastId = toast.info('Creating project and setting up pipeline...');
    
    try {
      const project = await projectService.createProject(newName, newDesc, newLink, newMembers, user.id, user.workspace_id);
      
      setIsModalOpen(false);
      const createdName = newName;
      setNewName(''); setNewMembers(''); setNewDesc(''); setNewLink('');
      
      toast.success(`Project "${createdName}" created successfully!`);
      if (creationToastId) removeToast(creationToastId);
      
      // Navigate to the new project workspace after a brief delay
      setTimeout(() => {
        navigate(`/project/${project.id}`);
      }, 500);
      
    } catch (error) {
      console.error('Project creation failed:', error);
      toast.error('Failed to create project. Please try again.');
      if (creationToastId) removeToast(creationToastId);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (user?.role !== 'admin') return;
    if (!window.confirm('Delete this activity entry?')) return;
    try {
      await adminService.deleteTimelineLog(logId);
      toast.success('Activity Purged');
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch {
      toast.error('Deletion Failed');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.team_members || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canCreateProject = user?.designation === 'Innovation & Research Team';

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-50">
      <div className="text-center">
        <OomaLogo className="text-[#6366f1] animate-pulse" size={48} />
        <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mt-4">Initializing Ooma...</p>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between border-b border-white/5 md:border-none">
        <div className="flex items-center gap-3">
          <OomaLogo className="text-[#6366f1]" size={32} />
          <div>
            <h1 className="text-md font-bold tracking-tight text-white">Ooma Workspace</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#6366f1]">Ooma Workflow</p>
          </div>
        </div>
        <button className="md:hidden p-2 text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="mt-6 px-3 space-y-1.5 flex-1">
        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group">
          <LayoutDashboard className="mr-3 h-4 w-4" />
          Dashboard
        </Link>
        <Link to="/ideas" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-500 rounded-xl hover:bg-white/[0.02] transition-colors">
          <Lightbulb className="mr-3 h-4 w-4 text-yellow-500" />
          Idea Vault
        </Link>
        <Link to="/contacts" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-500 rounded-xl hover:bg-white/[0.02] transition-colors">
          <Users className="mr-3 h-4 w-4 text-emerald-500" />
          Directory
        </Link>
        {user?.role === 'admin' && (
          <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-500 rounded-xl hover:bg-white/[0.02] transition-colors">
            <Settings className="mr-3 h-4 w-4" />
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="p-4 mt-auto space-y-3">
        <div className="flex items-center p-3 rounded-2xl bg-[#11111d] border border-white/5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border border-[#6366f1]/40 flex items-center justify-center font-bold text-white text-[10px]">
             {(user?.full_name || user?.username || 'U').substring(0,2).toUpperCase()}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-wider truncate">{user?.designation}</p>
          </div>
        </div>
        <button onClick={() => signOut()} className="w-full py-2.5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-red-500 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all">
          <LogOut className="mr-2 h-3 w-3" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#050505] text-white font-sans selection:bg-[#6366f1]/30 overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-[#0c0c0e] border-r border-white/5 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header - Premium Centered Layout */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 fixed top-0 left-0 right-0 z-[60]">
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <Menu className="h-5 w-5 text-gray-400" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <OomaLogo size={28} />
            <h1 className="text-[15px] font-black tracking-tight uppercase text-white">Ooma Workspace</h1>
          </div>
          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-0.5">Innovation Lab</p>
        </div>

        {/* Empty spacer to balance flex-between and keep center logo perfectly centered */}
        <div className="w-9"></div>
      </div>

      {/* Mobile Menu Overlay - Solid Premium Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-[85%] max-w-[320px] bg-[#0c0c0e] h-full shadow-2xl border-r border-white/5 animate-slide-in-left flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <OomaLogo className="text-[#6366f1]" size={28} />
                 <span className="text-sm font-black uppercase tracking-tight text-white">Workspace</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500">
                 <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth pt-16 md:pt-0 pb-20 md:pb-0 relative">
        <div className="max-w-[1300px] mx-auto p-5 md:p-10">
          
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Welcome back, <br className="md:hidden" />
                <span className="text-indigo-500">{user?.full_name?.split(' ')[0] || user?.username}</span>
              </h2>
              <p className="text-xs md:text-sm mt-1.5 text-gray-400 font-bold uppercase tracking-wider">
                Monitoring <span className="text-indigo-400">Ooma Workflow</span>
              </p>
            </div>
            
            {/* Desktop Create Project Button */}
            {canCreateProject && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="hidden lg:flex px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                Create Project
              </button>
            )}
          </div>

          {/* Mobile Create Project FAB */}
          {canCreateProject && (
            <button
               onClick={() => setIsModalOpen(true)}
               className="lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-600/40 flex items-center justify-center z-[100] active:scale-90 transition-all border border-white/10"
            >
               <Plus className="h-6 w-6" strokeWidth={3} />
            </button>
          )}

          {/* Search bar row */}
           <div className="flex flex-col xl:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects or team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-[#11111d] border border-white/5 rounded-2xl text-[14px] outline-none focus:border-indigo-500/30 transition-all font-medium text-white"
              />
              <Filter className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex overflow-x-auto pb-2 xl:pb-0 gap-2 scrollbar-hide">
              {(['all', 'active', 'completed', 'rejected'] as StatusFilter[]).map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)} 
                  className={`px-5 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === status ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#18181e] text-gray-500 border border-white/5 hover:border-indigo-500/30'}`}
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
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                  {filteredProjects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                   <OomaLogo className="text-gray-800 mx-auto mb-4" size={56} />
                   <div className="text-gray-700 font-bold uppercase tracking-widest text-xs">No projects found</div>
                </div>
              )}
            </div>

            {/* Global Activity Feed */}
            <div className="xl:col-span-1">
              <div className="rounded-2xl bg-[#11111d] border border-white/5 overflow-hidden sticky top-24 shadow-2xl">
                <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-widest">Global Activity</h3>
                  <span className="ml-auto text-[10px] text-gray-400 font-black bg-white/5 px-2 py-0.5 rounded-full">
                    {logs.length}
                  </span>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {logs.map((log: any) => {
                    const projectName = log.projects?.name || 'a project';
                    let shortText = log.update_text;
                    let icon = '💬';

                    if (shortText.includes('Created project')) {
                      shortText = `created project '${projectName}'`;
                      icon = '🚀';
                    } else if (shortText.includes('advanced to')) {
                      const toStageMatch = shortText.match(/advanced to ([^\.]+)/);
                      const toStage = toStageMatch ? toStageMatch[1] : log.stage;
                      shortText = `moved '${projectName}' to ${toStage}`;
                      icon = '➡️';
                    } else {
                       shortText = `${shortText} on '${projectName}'`;
                    }

                    return (
                      <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors group relative">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[12px] text-gray-400 leading-relaxed font-medium pr-6">
                            {icon} <span className="font-bold text-indigo-400">{log.user_name}</span> {shortText}
                          </p>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="absolute top-4 right-4 p-1 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {logs.length === 0 && (
                    <div className="p-10 text-center text-gray-600 font-bold uppercase tracking-widest text-[10px]">No activity yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Chat Bubble - handled by ChatWidget in App.tsx now */}

      {/* Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#11111d] rounded-[32px] border border-white/10 w-full max-w-md overflow-hidden shadow-3xl animate-modal-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-white">
              <h3 className="text-2xl font-black tracking-tight">Create Project</h3>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">Define the vision for a new innovation.</p>
            </div>
            <form onSubmit={handleCreateProject} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Workspace Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Project Hyperdrive" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Team Members</label>
                <input required value={newMembers} onChange={e => setNewMembers(e.target.value)} placeholder="e.g. Jane Doe, John Smith" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Objectives</label>
                <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What problem does this innovation solve?" className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-indigo-500/50 h-24 text-sm font-semibold resize-none text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-1">Google Drive Folder Link</label>
                <input type="url" required value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-sm font-semibold text-white" />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">Cancel</button>
                <button disabled={creating} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 font-bold">
                  {creating ? 'Launching...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {creating && <LoadingOverlay message="Forging New Project..." />}
    </div>
  );
}
