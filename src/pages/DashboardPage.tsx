import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {
  Plus, LayoutDashboard, LogOut, Settings, History,
  Search, X, Menu, Filter
} from 'lucide-react';
import { OomaLogo } from '@/components/OomaLogo';
import { useNavigate, Link } from 'react-router-dom';
import { LoadingOverlay } from '@/components/LoadingOverlay';

type StatusFilter = 'all' | 'active' | 'completed' | 'rejected';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();

  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    if (!user) return;
    
    setCreating(true);
    const creationToastId = toast.info('Creating project and setting up pipeline...');
    
    try {
      const project = await projectService.createProject(newName, newDesc, newLink, newMembers, user.id);
      
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
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch {
      toast.error('Deletion Failed');
    }
  };

  const filteredProjects = projects.filter((p: Project & { project_stages: ProjectStage[] }) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.team_members || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canCreateProject = user?.designation === 'Innovation & Research Team';

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <OomaLogo className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Ooma Workspace</h1>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Ooma Workflow</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
        >
          <LayoutDashboard className="mr-3 h-4 w-4" /> Dashboard
        </Link>
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center px-4 py-3 text-sm font-medium text-gray-400 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Settings className="mr-3 h-4 w-4" /> Admin Panel
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1A24] mb-3 border border-[#2F2F3B]">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(user?.full_name || user?.username || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.designation}</p>
          </div>
        </div>
        <button
          onClick={() => { signOut(); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 rounded-xl hover:bg-red-500/10 transition-colors border border-red-500/20"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0B]">
      <div className="text-center">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse box-glow-indigo">
          <OomaLogo className="text-indigo-400" size={32} />
        </div>
        <p className="text-gray-400 font-bold tracking-widest text-xs uppercase animate-pulse">Initializing Ooma...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – desktop (fixed) + mobile (slide-in) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#121216] border-r border-[#1F1F26] flex flex-col h-screen
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar */}
        <header className="bg-[#121216]/90 backdrop-blur-md border-b border-[#1F1F26] px-4 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                Welcome back, <span className="text-indigo-400">{user?.full_name?.split(' ')[0] || user?.username}</span>
              </h2>
              <p className="text-xs text-gray-400 font-medium hidden sm:block">You are currently monitoring the <span className="text-gray-300 font-bold">Ooma Workflow</span></p>
            </div>
          </div>

          {canCreateProject && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 text-sm font-bold flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </header>

        <div className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects or team members…"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A24] border border-[#2F2F3B] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
              {(['all', 'active', 'completed', 'rejected'] as StatusFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                    statusFilter === f
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-[#1A1A24] border border-[#2F2F3B] text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Projects grid */}
            <div className="xl:col-span-3">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredProjects.map((project: Project & { project_stages: ProjectStage[] }) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                    <OomaLogo className="text-indigo-300" size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {searchQuery || statusFilter !== 'all' ? 'No projects match your filter' : 'No projects yet'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-xs">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : canCreateProject
                        ? 'Create your first innovation project to get started.'
                        : 'Projects created by the Innovation team will appear here.'}
                  </p>
                  {canCreateProject && !searchQuery && statusFilter === 'all' && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-sm"
                    >
                      <Plus className="h-4 w-4" /> Create First Project
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Global Activity Feed */}
            <div className="xl:col-span-1">
              <div className="bg-[#121216] rounded-2xl border border-[#1F1F26] shadow-xl shadow-black/50 overflow-hidden sticky top-24">
                <div className="p-4 border-b border-[#1F1F26] bg-[#1A1A24]/50 flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-bold text-white text-sm">Global Activity</h3>
                  <span className="ml-auto text-[10px] text-gray-300 font-medium bg-[#2A2A35] px-2 py-0.5 rounded-full">
                    {logs.length}
                  </span>
                </div>
                <div className="divide-y divide-[#1F1F26] max-h-[500px] overflow-y-auto">
                  {logs.map((log: any) => {
                    // Make it short/readable e.g "ajay_innovator created project 'Alpha'"
                    const projectName = log.projects?.name || 'a project';
                    let shortText = log.update_text;
                    let icon = '💬';

                    if (shortText.includes('Created project')) {
                      shortText = `created project '${projectName}'`;
                      icon = '🚀';
                    } else if (shortText.includes('advanced to')) {
                      // e.g., "Completed Ideology stage and advanced to Research." -> "moved 'Alpha' to Research"
                      const toStageMatch = shortText.match(/advanced to ([^\.]+)/);
                      const toStage = toStageMatch ? toStageMatch[1] : log.stage;
                      shortText = `moved '${projectName}' to ${toStage}`;
                      icon = '➡️';
                    } else if (shortText.includes('Logged an update')) {
                      shortText = `updated '${projectName}'`;
                    } else {
                       shortText = `${shortText} on '${projectName}'`;
                    }

                    return (
                      <div key={log.id} className="p-4 hover:bg-[#1A1A24] transition-colors group relative">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs text-gray-200 leading-relaxed font-medium pr-6">
                            {icon} <span className="font-bold text-indigo-400">{log.user_name}</span> {shortText}
                          </p>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="absolute top-4 right-4 p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {logs.length === 0 && (
                    <div className="p-10 text-center text-gray-400 text-sm">No activity yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#1A1A24] border border-[#2F2F3B] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-in"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
              <h3 className="text-xl font-extrabold">Create New Project</h3>
              <p className="text-indigo-200 text-sm mt-1">Define the vision for a new Ooma innovation.</p>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {[
                { label: 'Project Name', value: newName, setter: setNewName, placeholder: 'e.g. NextGen Robotics Platform', type: 'text' },
                { label: 'Team Members', value: newMembers, setter: setNewMembers, placeholder: 'e.g. Jane Doe, John Smith', type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                  <input
                    type={f.type} required value={f.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 bg-[#121216] border border-[#2F2F3B] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Short Description</label>
                <textarea
                  required value={newDesc}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewDesc(e.target.value)}
                  placeholder="What problem does this innovation solve?"
                  className="w-full px-3 py-2.5 bg-[#121216] border border-[#2F2F3B] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Google Drive Folder Link</label>
                <input
                  type="url" required value={newLink}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2.5 bg-[#121216] border border-[#2F2F3B] rounded-xl text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">This folder will be the shared documentation workspace for all teams.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-[#2F2F3B] text-gray-400 rounded-xl hover:bg-white/5 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 text-sm font-bold disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
                >
                  {creating ? 'Creating…' : 'Create Project'}
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
