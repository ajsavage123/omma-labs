import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, AdminRating } from '@/types';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import {
  BarChart3, Rocket, Search, Code, Star, ChevronLeft,
  Activity, CheckCircle2, XCircle, RefreshCcw, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);

  // Rating Form State
  const [ratings, setRatings] = useState({
    problem_importance: 5,
    technical_feasibility: 5,
    market_demand: 5,
    impact_potential: 5,
    development_complexity: 5,
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<AdminRating | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsData, projectsData] = await Promise.all([
        adminService.getAdminStats(),
        projectService.getProjects()
      ]);
      setStats(statsData);
      setProjects(projectsData);
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
      impact_potential: 5, development_complexity: 5
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
             development_complexity: rating.development_complexity
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

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <ShieldAlert className="h-10 w-10 text-indigo-400 mb-4" />
        <p className="text-gray-500 font-medium">Loading Admin Panel…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Innovation Dashboard</h1>
            <p className="text-[10px] sm:text-xs text-indigo-600 font-bold uppercase tracking-widest shrink-0">Admin Control Center</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-[1400px] mx-auto w-full">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatCard icon={<BarChart3 className="text-indigo-600" />} label="Active" value={stats.activeProjects} />
          <StatCard icon={<Search className="text-blue-600" />} label="Research" value={stats.researchCount} />
          <StatCard icon={<Code className="text-purple-600" />} label="Development" value={stats.developmentCount} />
          <StatCard icon={<Rocket className="text-emerald-600" />} label="Launch" value={stats.launchCount} />
          <StatCard icon={<Activity className="text-orange-600" />} label="Top Team" value={stats.mostActiveTeam} isText className="col-span-2 md:col-span-4 lg:col-span-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Projects Table */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <h3 className="font-bold text-gray-900 text-sm">Project Master List</h3>
                <span className="ml-auto text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{stats.adminReviewCount} pending review</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white border-b border-gray-100 text-gray-400 uppercase text-[10px] font-extrabold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Current Stage</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {projects.map((project: Project & { project_stages: ProjectStage[] }) => {
                      const completedCount = project.project_stages?.filter((s: ProjectStage) => s.status === 'completed').length || 0;
                      const currentStage = project.project_stages?.find(s => s.status === 'in_progress')?.stage_name || (completedCount === 6 ? 'completed' : 'pending');
                      const isAdminReview = currentStage === 'admin_review';

                      return (
                        <tr key={project.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4 font-bold text-gray-900">{project.name}</td>
                          <td className="px-6 py-4 capitalize text-gray-600 text-xs font-semibold">{currentStage.replace('_', ' ')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest ${
                              project.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              project.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {project.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isAdminReview ? (
                              <button
                                onClick={() => loadProjectRating(project)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold justify-center rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                              >
                                Evaluate
                              </button>
                            ) : (
                              <button
                                onClick={() => loadProjectRating(project)}
                                className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {projects.length === 0 && (
                      <tr>
                         <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm font-medium">No projects in the system.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-5 xl:col-span-4">
            {selectedProject ? (
              <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden sticky top-24 animate-modal-in flex flex-col max-h-[calc(100vh-8rem)]">
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
                  <div className="space-y-5">
                    <RatingInput label="Problem Importance" value={ratings.problem_importance} onChange={(v) => handleRatingChange('problem_importance', v)} readOnly={!!existingRating} />
                    <RatingInput label="Technical Feasibility" value={ratings.technical_feasibility} onChange={(v) => handleRatingChange('technical_feasibility', v)} readOnly={!!existingRating} />
                    <RatingInput label="Market Demand" value={ratings.market_demand} onChange={(v) => handleRatingChange('market_demand', v)} readOnly={!!existingRating} />
                    <RatingInput label="Impact Potential" value={ratings.impact_potential} onChange={(v) => handleRatingChange('impact_potential', v)} readOnly={!!existingRating} />
                    <RatingInput label="Dev Complexity" value={ratings.development_complexity} onChange={(v) => handleRatingChange('development_complexity', v)} readOnly={!!existingRating} />
                  </div>

                  <div className="pt-5 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <span className="font-extrabold text-gray-900 text-sm">Innovation Score</span>
                      <span className="text-3xl font-black text-indigo-600 drop-shadow-sm">{calculateScore()}</span>
                    </div>
                    <textarea
                      placeholder={existingRating ? "No notes provided." : "Admin notes and feedback..."}
                      className="w-full p-4 text-sm bg-gray-50 border border-gray-200 rounded-xl min-h-[100px] focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors outline-none resize-none"
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      readOnly={!!existingRating}
                    />
                  </div>

                  {!existingRating && (
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <button
                        onClick={() => handleAdminAction('completed')}
                        disabled={submitting}
                        className="flex items-center justify-center p-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-200 flex-1"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve & Complete
                      </button>
                      <button
                        onClick={() => handleAdminAction('active')}
                        disabled={submitting}
                        className="flex items-center justify-center p-3.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-md shadow-amber-200"
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" /> Return for Iteration
                      </button>
                      <button
                        onClick={() => handleAdminAction('rejected')}
                        disabled={submitting}
                        className="flex items-center justify-center p-3.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <Star className="h-8 w-8 text-indigo-200" />
                </div>
                <h3 className="text-gray-900 font-bold mb-1">No Project Selected</h3>
                <p className="text-gray-400 text-sm max-w-xs">Select a project in the "Admin Review" stage to process its evaluation.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function StatCard({ icon, label, value, isText, className = '' }: { icon: React.ReactNode, label: string, value: any, isText?: boolean, className?: string }) {
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 ${className}`}>
      <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest truncate">{label}</p>
        <p className={`${isText ? 'text-sm' : 'text-2xl'} font-black text-gray-900 truncate`}>{value}</p>
      </div>
    </div>
  );
}

function RatingInput({ label, value, onChange, readOnly }: { label: string, value: number, onChange: (v: number) => void, readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-600 uppercase tracking-wider">{label}</span>
        <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{value} / 10</span>
      </div>
      <input
        type="range" min="1" max="10"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseInt(e.target.value))}
        disabled={readOnly}
        className={`w-full h-2 bg-gray-100 rounded-full appearance-none accent-indigo-600 ${readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      />
    </div>
  );
}
