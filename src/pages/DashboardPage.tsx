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
import { GoogleMeetIcon } from '@/components/GoogleMeetIcon';
import { Plus, LayoutDashboard, LogOut, Settings, Search, Menu, X, Trash2, History, Users, ChevronUp, ChevronDown, Wrench, Book, Activity, CircleDollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type StatusFilter = 'all' | 'active' | 'completed' | 'rejected' | 'internal' | 'client';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  
  // Search + filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Form State
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newGithubLink, setNewGithubLink] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newProjectType, setNewProjectType] = useState<'internal' | 'client'>('internal');
  const [creating, setCreating] = useState(false);
  const [triedToSubmit, setTriedToSubmit] = useState(false);
  const [editingProject, setEditingProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);

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
    setTriedToSubmit(true);

    if (!newName.trim() || !newLink.trim() || !newDesc.trim()) {
      toast.error('Please fill all required fields highlighted in red.');
      return;
    }

    if (!user || !user.workspace_id) return;
    
    setCreating(true);
    const creationToastId = toast.info(editingProject ? 'Updating project...' : 'Creating project and setting up pipeline...');
    
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, {
          name: newName,
          description: newDesc,
          drive_link: newLink,
          github_link: newGithubLink || undefined,
          team_members: newMembers || undefined,
          deadline: newDeadline || undefined,
          client_name: newClientName || undefined,
          client_phone: newClientPhone || undefined
        });
        toast.success(`Project "${newName}" updated successfully!`);
        setEditingProject(null);
      } else {
        const project = await projectService.createProject(
          newName, newDesc, newLink, newGithubLink || null, newMembers, user.id, user.workspace_id, 
          newProjectType, newDeadline || null, newClientName || null, newClientPhone || null
        );
        toast.success(`Project "${newName}" created successfully!`);
        setTimeout(() => navigate(`/project/${project.id}`), 500);
      }
      
      setIsModalOpen(false);
      setNewName(''); setNewMembers(''); setNewDesc(''); setNewLink(''); setNewGithubLink(''); setNewDeadline(''); setNewClientName(''); setNewClientPhone(''); setNewProjectType('internal');
      setTriedToSubmit(false);
      fetchData();
      
    } catch (error) {
      console.error('Project operation failed:', error);
      toast.error('Operation failed. Please try again.');
    } finally {
      if (creationToastId) removeToast(creationToastId);
      setCreating(false);
    }
  };

  const handleEditClick = (project: Project & { project_stages: ProjectStage[] }) => {
    setEditingProject(project);
    setNewName(project.name);
    setNewDesc(project.description);
    setNewLink(project.drive_link);
    setNewGithubLink(project.github_link || '');
    setNewMembers(project.team_members || '');
    setNewDeadline(project.deadline || '');
    setNewClientName(project.client_name || '');
    setNewClientPhone(project.client_phone || '');
    setIsModalOpen(true);
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
    
    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'internal') {
      matchesStatus = p.project_type === 'internal';
    } else if (statusFilter === 'client') {
      matchesStatus = p.project_type === 'client';
    } else {
      matchesStatus = p.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const canCreateProject = user?.role === 'admin' || user?.designation === 'Innovation & Research Team';

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-50">
      <div className="text-center">
        <OomaLogo className="text-[#6366f1] animate-pulse" size={48} />
        <p className="text-gray-600 font-bold tracking-widest text-[10px] uppercase mt-4">Initializing Ooma...</p>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
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

      <nav className="mt-4 px-3 space-y-1.5 overflow-y-auto scrollbar-hide">
        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group">
          <LayoutDashboard className="mr-3 h-4 w-4" />
          Dashboard
        </Link>
        <Link to="/office" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 rounded-xl hover:bg-cyan-500/10 transition-colors relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Activity className="mr-3 h-4 w-4" />
          Live HQ (Beta)
        </Link>
        <Link to="/meetings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
          <GoogleMeetIcon size={16} className="mr-3" />
          Meetings
        </Link>
        <Link to="/ideas" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
          <Wrench className="mr-3 h-4 w-4 text-emerald-500" />
          Tools Space
        </Link>
        <Link to="/directory" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
          <Users className="mr-3 h-4 w-4 text-emerald-500" />
          Team Library
        </Link>
        <Link to="/library" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
          <Book className="mr-3 h-4 w-4 text-blue-400" />
          Docs Library
        </Link>
        {(() => {
          const isDev = user?.designation === 'Developer & Engineering Team';
          const [accessStatus, setAccessStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
          
          useEffect(() => {
            if (isDev && user?.id && user?.workspace_id) {
              import('@/services/crmAccessService').then(({ crmAccessService }) => {
                crmAccessService.getAccessStatus(user.id, user.workspace_id).then(status => {
                  setAccessStatus(status as any);
                });
              });
            }
          }, [isDev, user?.id, user?.workspace_id]);

          const handleCRMClick = async (e: React.MouseEvent) => {
            if (isDev && accessStatus !== 'approved') {
              e.preventDefault();
              if (accessStatus === 'none') {
                if (window.confirm("You don't have access to the CRM Pipeline. Would you like to request access from the admin?")) {
                  try {
                    const { crmAccessService } = await import('@/services/crmAccessService');
                    await crmAccessService.requestAccess(user!.id, user!.workspace_id);
                    setAccessStatus('pending');
                    toast.success("Access request sent to admin.");
                  } catch (err) {
                    toast.error("Failed to send request.");
                  }
                }
              } else if (accessStatus === 'pending') {
                alert("Your access request is still pending approval.");
              } else if (accessStatus === 'rejected') {
                alert("Your access request was rejected. Please contact an admin for details.");
              }
            } else {
              setIsMobileMenuOpen(false);
            }
          };

          return (
            <Link 
              to="/crm" 
              onClick={handleCRMClick} 
              className={`flex items-center px-4 py-3 text-[13px] font-bold rounded-xl transition-colors ${
                isDev && accessStatus !== 'approved' 
                  ? 'text-gray-500 bg-white/[0.01] cursor-pointer' 
                  : 'text-gray-400 hover:bg-white/[0.02] hover:text-white'
              }`}
            >
              <CircleDollarSign className={`mr-3 h-4 w-4 ${isDev && accessStatus !== 'approved' ? 'text-gray-600' : 'text-emerald-400'}`} />
              <div className="flex flex-col">
                <span>CRM Pipeline</span>
                {isDev && accessStatus === 'pending' && <span className="text-[8px] text-amber-500 uppercase">Request Pending</span>}
                {isDev && accessStatus === 'rejected' && <span className="text-[8px] text-red-500 uppercase">Access Denied</span>}
                {isDev && accessStatus === 'none' && <span className="text-[8px] text-indigo-400 uppercase">Locked • Click to Request</span>}
              </div>
            </Link>
          );
        })()}
        {user?.role === 'admin' && (
          <>
            <Link to="/contacts" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
              <Plus className="mr-3 h-4 w-4 text-amber-500" />
              Client Contacts
            </Link>
            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
              <Settings className="mr-3 h-4 w-4" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto p-4 border-t border-white/5 space-y-4 bg-black/20">
        <div className="flex items-center p-2.5 rounded-2xl bg-[#11111d] border border-white/5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border border-[#6366f1]/40 flex items-center justify-center font-bold text-white text-[10px]">
             {(user?.full_name || user?.username || 'U').substring(0,2).toUpperCase()}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-[11px] font-bold text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider truncate">{user?.designation}</p>
          </div>
        </div>
        <button onClick={() => signOut()} className="w-full py-2.5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#94a3b8] hover:text-red-500 rounded-xl border border-white/5 hover:border-red-500/20 bg-white/5 hover:bg-red-500/5 transition-all">
          <LogOut className="mr-2 h-3 w-3" />
          Sign Out
        </button>
      </div>
    </div>
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
          <div className="relative w-[85%] max-w-[300px] bg-[#0c0c0e] h-full shadow-2xl border-r border-white/5 animate-slide-in-left">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative pt-16 md:pt-0">
        <div className="max-w-[1900px] w-full mx-auto px-4 md:px-10 flex flex-col h-[calc(100vh-64px)] md:h-screen min-h-0 pt-1 sm:pt-4">
          
          {/* Static / Sticky Header Area */}
          <div className="flex-none pt-2 md:pt-10 pb-2 md:pb-6 border-b border-transparent">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-3 md:mb-6 gap-2 md:gap-6">
              <div className="min-w-0">
                <h2 className="text-xl md:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-x-2">
                  <span className="text-gray-400">Hey,</span>
                  <span className="text-indigo-500 truncate max-w-[150px] sm:max-w-none">{user?.full_name?.split(' ')[0] || user?.username}</span>
                </h2>
                <p className="hidden md:block text-xs md:text-sm mt-0.5 text-gray-500 font-bold uppercase tracking-wider">
                  Monitoring <span className="text-indigo-400">Ooma Workflow</span>
                </p>
              </div>
              
              {canCreateProject && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center active:scale-90 shrink-0"
                  title="Create New Project"
                >
                  <Plus className="h-5 w-5 md:h-6 md:w-6" strokeWidth={3} />
                </button>
              )}
            </div>

            {/* Search bar row */}
             <div className="flex flex-col xl:flex-row gap-2 md:gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Reviewing Ooma project directory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 md:pl-14 pr-4 py-3 md:py-5 bg-[#0a0a0d] border border-white/15 rounded-[20px] md:rounded-[24px] text-[13px] md:text-[16px] font-black text-white placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                />
              </div>
              <div className="flex overflow-x-auto gap-1.5 scrollbar-hide py-1">
                {(['all', 'internal', 'client', 'active', 'completed', 'rejected'] as const).map(status => (
                  <button 
                    key={status}
                    onClick={() => setStatusFilter(status as any)} 
                    className={`px-4 py-2.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === status ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#18181e] text-gray-500 border border-white/5 hover:border-indigo-500/30'}`}
                  >
                    {status === 'internal' ? 'Internal Project' : status === 'client' ? 'Client Project' : status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
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

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 mt-4 pb-4">
            
            {/* Project List (Scrolls independently) */}
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar pr-1 md:pr-2 z-10">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 md:gap-10">
                  {filteredProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onEdit={handleEditClick}
                      canEdit={user?.role === 'admin' || user?.designation === 'Innovation & Research Team'}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                   <OomaLogo className="text-gray-800 mx-auto mb-4" size={56} />
                   <div className="text-gray-700 font-bold uppercase tracking-widest text-xs">No projects found</div>
                </div>
              )}
            </div>

            {/* Global Activity Feed (Collapsible) */}
            <div className={`w-full xl:w-[280px] 2xl:w-[340px] flex-none flex flex-col mt-2 xl:mt-0 xl:pb-4 transition-all duration-300 ease-in-out ${isActivityOpen ? 'h-[250px] xl:h-full' : 'h-14'}`}>
              <div className="rounded-2xl bg-[#11111d] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-full">
                <div 
                  className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center gap-2 shrink-0 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() => setIsActivityOpen(!isActivityOpen)}
                >
                  <History className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-widest select-none">Global Activity</h3>
                  <span className="ml-auto text-[10px] text-gray-400 font-black bg-white/5 px-2 py-0.5 rounded-full mr-2">
                    {logs.length}
                  </span>
                  {isActivityOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                </div>
                
                {isActivityOpen && (
                  <div className="divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar animate-fade-in">
                  {logs.map((log: any) => {
                    const projectName = log.projects?.name || 'a project';
                    let shortText = log.update_text;
                    let icon = '💬';

                    if (shortText.includes('Project created')) {
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
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Chat Bubble - handled by ChatWidget in App.tsx now */}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm md:max-w-2xl bg-[#0c0c0e] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-y-auto max-h-[95vh] animate-modal-in scrollbar-hide">
              <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-3 sm:p-5 border-b border-white/5 text-center relative">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                  {editingProject ? 'Modify Project' : 'Assemble Project'}
                </h2>
                <p className="text-indigo-400 text-[7px] sm:text-[8px] font-bold uppercase tracking-widest mt-0.5 sm:mt-1">
                  {editingProject ? 'Updating ecosystem node' : 'Deploying to Ooma Ecosystem'}
                </p>
             </div>
                    <form onSubmit={handleCreateProject} className="p-5 sm:p-8 space-y-6">
                
                {/* Dual Track Segmented Control */}
                {!editingProject && (
                  <div className="flex bg-[#18181e] p-1.5 rounded-2xl border border-white/10 relative">
                    <button 
                      type="button"
                      onClick={() => setNewProjectType('internal')}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all z-10 ${newProjectType === 'internal' ? 'text-white bg-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Internal Project
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewProjectType('client')}
                      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all z-10 ${newProjectType === 'client' ? 'text-white bg-emerald-600 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Client Project
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Project Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="Project identity..." 
                    className={`w-full bg-white/[0.05] border p-4 rounded-2xl outline-none text-[15px] font-bold text-white transition-all ${
                      triedToSubmit && !newName.trim() ? 'border-red-500/60 bg-red-500/5' : 'border-white/20 focus:border-indigo-500/50'
                    }`} 
                  />
                </div>
                
                {(newProjectType === 'client' || editingProject?.project_type === 'client') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Client Name</label>
                      <input type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Client Name..." className="w-full bg-white/[0.05] border border-white/20 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-[15px] font-bold text-white transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Client Phone</label>
                      <input type="tel" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Phone/Contact..." className="w-full bg-white/[0.05] border border-white/20 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-[15px] font-bold text-white transition-all" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Deadline Date</label>
                    <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="w-full bg-white/[0.05] border border-white/20 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-[15px] font-bold text-white transition-all [color-scheme:dark]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Collaborators / Team</label>
                    <input type="text" value={newMembers} onChange={e => setNewMembers(e.target.value)} placeholder="Team names..." className="w-full bg-white/[0.05] border border-white/20 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-[15px] font-bold text-white transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Mission Scope <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)} 
                    placeholder="Mission scope & mission brief..." 
                    className={`w-full bg-white/[0.05] border p-4 rounded-2xl outline-none text-[15px] font-bold text-white transition-all ${
                      triedToSubmit && !newDesc.trim() ? 'border-red-500/60 bg-red-500/5' : 'border-white/20 focus:border-indigo-500/50'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Document Link <span className="text-red-500">*</span></label>
                    <input 
                      type="url" 
                      value={newLink} 
                      onChange={e => setNewLink(e.target.value)} 
                      placeholder="Drive / Docs..." 
                      className={`w-full bg-white/[0.05] border p-4 rounded-2xl outline-none text-[15px] font-bold text-white transition-all ${
                        triedToSubmit && !newLink.trim() ? 'border-red-500/60 bg-red-500/5' : 'border-white/20 focus:border-indigo-500/50'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] sm:text-[11px] font-black text-indigo-300 uppercase tracking-[0.2em] ml-1">Repository Link</label>
                    <input type="url" value={newGithubLink} onChange={e => setNewGithubLink(e.target.value)} placeholder="GitHub / Repo..." className="w-full bg-white/[0.05] border border-white/20 p-4 rounded-2xl outline-none focus:border-indigo-500/50 text-[15px] font-bold text-white transition-all" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingProject(null); }} className="flex-1 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98]">
                    {creating ? 'Processing...' : (editingProject ? 'Execute Update' : 'Initialize Project')}
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
