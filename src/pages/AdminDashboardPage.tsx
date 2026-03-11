import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { projectService } from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import type { Project, ProjectStage, AdminRating } from '@/types';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {
  BarChart3, Rocket, Search, Code, Star, ChevronLeft,
  Activity, XCircle, ShieldAlert, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toasts, toast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<'projects' | 'users'>('projects');
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoleLoading, setUserRoleLoading] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);

  // Rating Form State
  const [ratings, setRatings] = useState({
    problem_importance: 5,
    technical_feasibility: 5,
    market_demand: 5,
    impact_potential: 5,
    development_complexity: 5,
    innovation_rating: 5,
    engineering_rating: 5,
    business_rating: 5,
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<AdminRating | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.role !== 'admin') {
        navigate('/');
        return;
      }
      fetchData();
    }
  }, [authLoading, currentUser]);

  const fetchData = async () => {
    try {
      const [statsData, projectsData, usersData] = await Promise.all([
        adminService.getAdminStats(),
        projectService.getProjects(),
        adminService.getAllUsers()
      ]);
      setStats(statsData);
      setProjects(projectsData);
      setAllUsers(usersData);
    } catch {
      toast.error('Failed to load admin panel data.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectRating = async (project: Project & { project_stages: ProjectStage[] }) => {
    setSelectedProject(project);
    setExistingRating(null);
    setNotes('');
    setRatings({
      problem_importance: 5, technical_feasibility: 5, market_demand: 5,
      impact_potential: 5, development_complexity: 5,
      innovation_rating: 5, engineering_rating: 5, business_rating: 5
    });

    try {
      if (project.status === 'completed' || project.status === 'rejected') {
        const rating = await adminService.getProjectRating(project.id);
        if (rating) {
          setExistingRating(rating);
          setRatings({
             problem_importance: rating.problem_importance,
             technical_feasibility: rating.technical_feasibility,
             market_demand: rating.market_demand,
             impact_potential: rating.impact_potential,
             development_complexity: rating.development_complexity,
             innovation_rating: rating.innovation_rating || 5,
             engineering_rating: rating.engineering_rating || 5,
             business_rating: rating.business_rating || 5
          });
          setNotes(rating.notes || '');
        }
      }
    } catch {
      toast.error('Failed to load existing rating.');
    }
  };

  const handleRatingChange = (field: string, value: number) => {
    setRatings((prev: any) => ({ ...prev, [field]: value }));
  };

  const calculateScore = () => {
    const vals = Object.values(ratings) as number[];
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const handleAdminAction = async (status: 'completed' | 'active' | 'rejected') => {
    if (!selectedProject) return;
    setSubmitting(true);
    try {
      const innovationScore = parseFloat(calculateScore());
      await adminService.submitRating({
        project_id: selectedProject.id,
        ...ratings,
        innovation_score: innovationScore,
        notes
      });
      await adminService.updateProjectStatus(selectedProject.id, status, notes);

      setSelectedProject(null);
      await fetchData();

      const msg = status === 'completed' ? 'Project Approved!' : status === 'rejected' ? 'Project Rejected.' : 'Returned for Improvements.';
      toast.success(msg);
    } catch {
      toast.error('Failed to submit decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) return;
    
    setLoading(true);
    try {
      await adminService.deleteProject(projectId);
      toast.success(`Project "${projectName}" deleted successfully.`);
      await fetchData();
    } catch {
      toast.error('Failed to delete project.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0B]">
      <div className="animate-pulse flex flex-col items-center">
        <ShieldAlert className="h-10 w-10 text-indigo-400 mb-4" />
        <p className="text-gray-400 font-medium">{authLoading ? 'Verifying Identity...' : 'Forging Admin Console...'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      <header className="bg-[#121216] border-b border-[#1F1F26] px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-[#1F1F26] hover:bg-[#2F2F3B] text-gray-400 rounded-xl transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Innovation Dashboard</h1>
            <p className="text-[10px] sm:text-xs text-indigo-400 font-bold uppercase tracking-widest shrink-0">Admin Control Center</p>
          </div>
        </div>

        <div className="flex bg-[#1F1F26] p-1 rounded-xl ml-auto">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Projects
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            User Management
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-[1400px] mx-auto w-full">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<BarChart3 className="text-indigo-600" />} label="Active" value={stats?.activeProjects || 0} />
          <StatCard icon={<Search className="text-blue-600" />} label="Research" value={stats?.researchCount || 0} />
          <StatCard icon={<Code className="text-purple-600" />} label="Development" value={stats?.developmentCount || 0} />
          <StatCard icon={<Rocket className="text-emerald-600" />} label="Launch" value={stats?.launchCount || 0} />
          <StatCard icon={<Activity className="text-orange-600" />} label="Top Team" value={stats?.mostActiveTeam || 'None'} isText className="col-span-2 md:col-span-4 lg:col-span-1" />
        </div>

        {activeTab === 'projects' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="bg-[#121216] rounded-2xl shadow-sm border border-[#1F1F26] overflow-hidden">
                <div className="p-5 border-b border-[#1F1F26] bg-[#16161D] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-white text-sm">Project Master List</h3>
                  <span className="ml-auto text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{stats?.adminReviewCount || 0} pending review</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-[#16161D] border-b border-[#1F1F26] text-gray-500 uppercase text-[10px] font-extrabold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Current Stage</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Inno Score</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F26] bg-[#121216]">
                      {projects.map((project) => {
                        const completedCount = project.project_stages?.filter((s) => s.status === 'completed').length || 0;
                        const currentStage = project.project_stages?.find(s => s.status === 'in_progress')?.stage_name || (completedCount === 6 ? 'completed' : 'pending');
                        const isAdminReview = currentStage === 'admin_review';

                        return (
                          <tr key={project.id} className="hover:bg-[#1A1A24] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white mb-0.5">{project.name}</div>
                              <div className="text-[10px] text-gray-500 font-mono uppercase">ID: {project.id.slice(0, 8)}</div>
                            </td>
                            <td className="px-6 py-4 capitalize text-gray-300 text-xs font-bold tracking-wide">
                              <span className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${isAdminReview ? 'bg-amber-500' : 'bg-indigo-500'} animate-pulse`}></span>
                                {currentStage.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest ${
                                project.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                                project.status === 'completed' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                              }`}>
                                {project.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-indigo-400 font-black">
                              {project.status === 'completed' ? '8.4' : '---'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {isAdminReview ? (
                                  <button
                                    onClick={() => loadProjectRating(project)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black justify-center rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/40 border border-indigo-400/30"
                                  >
                                    Evaluate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => loadProjectRating(project)}
                                    className="text-xs font-black text-gray-400 hover:text-indigo-400 transition-colors uppercase tracking-widest"
                                  >
                                    View
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteProject(project.id, project.name)}
                                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4">
              {selectedProject ? (
                <div className="bg-[#121216] rounded-2xl shadow-xl border border-indigo-500/20 overflow-hidden sticky top-24 animate-modal-in flex flex-col max-h-[calc(100vh-8rem)]">
                  <div className="bg-gradient-to-br from-gray-900 to-indigo-900 p-6 text-white shrink-0">
                    <div className="flex justify-between items-start mb-2">
                       <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
                         {existingRating ? 'Historical Rating' : 'Active Evaluation'}
                       </p>
                       <button onClick={() => setSelectedProject(null)} className="text-gray-400 hover:text-white"><XCircle className="h-5 w-5"/></button>
                    </div>
                    <h3 className="font-extrabold text-xl leading-tight">{selectedProject.name}</h3>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Department Performance</h4>
                      <RatingInput label="Innovation & Research" value={ratings.innovation_rating} onChange={(v) => handleRatingChange('innovation_rating', v)} readOnly={!!existingRating} />
                      <RatingInput label="Engineering & Tech" value={ratings.engineering_rating} onChange={(v) => handleRatingChange('engineering_rating', v)} readOnly={!!existingRating} />
                      <RatingInput label="Business & Marketing" value={ratings.business_rating} onChange={(v) => handleRatingChange('business_rating', v)} readOnly={!!existingRating} />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[#1F1F26]">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Project Metrics</h4>
                      <RatingInput label="Problem Importance" value={ratings.problem_importance} onChange={(v) => handleRatingChange('problem_importance', v)} readOnly={!!existingRating} />
                      <RatingInput label="Technical Feasibility" value={ratings.technical_feasibility} onChange={(v) => handleRatingChange('technical_feasibility', v)} readOnly={!!existingRating} />
                      <RatingInput label="Market Demand" value={ratings.market_demand} onChange={(v) => handleRatingChange('market_demand', v)} readOnly={!!existingRating} />
                      <RatingInput label="Impact Potential" value={ratings.impact_potential} onChange={(v) => handleRatingChange('impact_potential', v)} readOnly={!!existingRating} />
                      <RatingInput label="Dev Complexity" value={ratings.development_complexity} onChange={(v) => handleRatingChange('development_complexity', v)} readOnly={!!existingRating} />
                    </div>

                    <div className="pt-5 border-t border-[#1F1F26]">
                      <div className="flex justify-between items-center mb-4 bg-[#1A1A24] p-4 rounded-xl border border-[#2F2F3B]">
                        <span className="font-extrabold text-white text-sm">Innovation Score</span>
                        <span className="text-3xl font-black text-indigo-400">{calculateScore()}</span>
                      </div>
                      <textarea
                        placeholder="Admin Notes..."
                        className="w-full p-4 text-sm bg-[#0A0A0B] border border-[#2F2F3B] rounded-xl min-h-[100px] text-gray-200 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        readOnly={!!existingRating}
                      />
                    </div>

                    {!existingRating && (
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        <button onClick={() => handleAdminAction('completed')} disabled={submitting} className="p-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                        <button onClick={() => handleAdminAction('active')} disabled={submitting} className="p-3.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50">Iterate</button>
                        <button onClick={() => handleAdminAction('rejected')} disabled={submitting} className="p-3.5 border-2 border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#121216] rounded-2xl border border-dashed border-[#2F2F3B] p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Star className="h-8 w-8 text-indigo-500/30 mb-4" />
                  <h3 className="text-white font-bold">No Project Selected</h3>
                  <p className="text-gray-500 text-sm">Evaluation details will appear here.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#121216] rounded-2xl border border-[#1F1F26] overflow-hidden">
            <div className="p-5 border-b border-[#1F1F26] bg-[#16161D] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">System Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#16161D] border-b border-[#1F1F26] text-gray-500 uppercase text-[10px] font-extrabold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Designation</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F26] bg-[#121216]">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#1A1A24] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                            {u.full_name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white">{u.full_name}</div>
                            <div className="text-[10px] text-gray-500">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">{u.designation}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${u.role === 'admin' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled={userRoleLoading === u.id}
                          onClick={async () => {
                            setUserRoleLoading(u.id);
                            try {
                              const newRole = u.role === 'admin' ? 'partner' : 'admin';
                              await adminService.updateUserRole(u.id, newRole);
                              toast.success('Role updated');
                              fetchData();
                            } catch {
                              toast.error('Update failed');
                            } finally {
                              setUserRoleLoading(null);
                            }
                          }}
                          className="text-[10px] font-black uppercase text-indigo-400 hover:underline"
                        >
                          {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function StatCard({ icon, label, value, isText, className = '' }: { icon: React.ReactNode, label: string, value: any, isText?: boolean, className?: string }) {
  return (
    <div className={`bg-[#121216] p-5 rounded-2xl border border-[#1F1F26] flex items-center gap-4 ${className}`}>
      <div className="h-12 w-12 rounded-xl bg-[#1F1F26] flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest truncate">{label}</p>
        <p className={`${isText ? 'text-sm' : 'text-2xl'} font-black text-white truncate`}>{value}</p>
      </div>
    </div>
  );
}

function RatingInput({ label, value, onChange, readOnly }: { label: string, value: number, onChange: (v: number) => void, readOnly?: boolean }) {
  return (
    <div className="space-y-4 p-4 bg-[#161621] rounded-2xl border border-[#2F2F3B] group hover:border-indigo-500/30">
      <div className="flex justify-between items-center text-[10px] font-black uppercase">
        <span className="text-gray-400 group-hover:text-indigo-400 transition-colors">{label}</span>
        <span className="text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">{value} / 10</span>
      </div>
      <div className="relative">
        <input
          type="range" min="1" max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={readOnly}
          className="w-full h-2 bg-[#252531] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
        />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full pointer-events-none"
          style={{ width: `${((value - 1) / 9) * 100}%` }}
        />
      </div>
    </div>
  );
}
