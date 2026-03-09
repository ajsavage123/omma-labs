import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog } from '@/types';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, LayoutDashboard, History, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newMembers, setNewMembers] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLink, setNewLink] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      setNewName('');
      setNewMembers('');
      setNewDesc('');
      setNewLink('');
      fetchData();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600">Ooma Workspace</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Innovation Pipeline</p>
        </div>

        <nav className="mt-4 px-4 space-y-1">
          <Link to="/" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-700">
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50">
              <Settings className="mr-3 h-5 w-5" />
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 mt-auto"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </nav>

        <div className="mt-10 px-6 py-4 border-t border-gray-100">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate w-32">{user?.designation}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Project Timeline Dashboard</h2>
              <p className="text-gray-500">Monitor and manage all active innovation projects.</p>
            </div>

            {user?.designation === 'Innovation & Research Team' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Project Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              {projects.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                  <p className="text-gray-400">No projects found. Create one to get started.</p>
                </div>
              )}
            </div>

            {/* Global Activity Feed */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <History className="mr-2 h-4 w-4 text-indigo-500" />
                    Global Activity
                  </h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-indigo-600">{log.user_name}</span>
                        <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-500 mb-1">{log.designation}</p>
                      <p className="text-sm text-gray-800 line-clamp-2">{log.update_text}</p>
                      <p className="text-[10px] mt-2 text-gray-400 uppercase tracking-tighter bg-gray-100 inline-block px-1 rounded">
                        {log.stage.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No activity logs yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Create New Project</h3>
              <p className="text-sm text-gray-500">Define the vision for a new Ooma innovation.</p>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Drone Defibrillator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Members</label>
                <input
                  type="text"
                  required
                  value={newMembers}
                  onChange={(e) => setNewMembers(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Ajay Narava, Rahul Kumar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24"
                  placeholder="What is this project about?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Drive Folder Link</label>
                <input
                  type="url"
                  required
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
