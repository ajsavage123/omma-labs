import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage } from '@/types';
import {
  BarChart3,
  Rocket,
  Search,
  Code,
  Star,
  ChevronLeft,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, projectsData] = await Promise.all([
        adminService.getAdminStats(),
        projectService.getProjects()
      ]);
      setStats(statsData);
      setProjects(projectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field: string, value: number) => {
    setRatings(prev => ({ ...prev, [field]: value }));
  };

  const calculateScore = () => {
    const vals = Object.values(ratings);
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
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ooma Labs Innovation Dashboard</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">Admin Control Center</p>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
          <StatCard icon={<BarChart3 className="text-indigo-600" />} label="Active Projects" value={stats.activeProjects} />
          <StatCard icon={<Search className="text-blue-600" />} label="Research Phase" value={stats.researchCount} />
          <StatCard icon={<Code className="text-purple-600" />} label="Development Phase" value={stats.developmentCount} />
          <StatCard icon={<Rocket className="text-emerald-600" />} label="Launch Phase" value={stats.launchCount} />
          <StatCard icon={<Activity className="text-orange-600" />} label="Most Active" value={stats.mostActiveTeam} isText />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-indigo-500" />
                  All Projects
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Current Stage</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projects.map(project => {
                      const currentStage = project.project_stages?.find(s => s.status === 'in_progress')?.stage_name || 'N/A';
                      const isAdminReview = currentStage === 'admin_review';

                      return (
                        <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{project.name}</td>
                          <td className="px-6 py-4 capitalize">{currentStage.replace('_', ' ')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              project.status === 'active' ? 'bg-green-100 text-green-700' :
                              project.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {project.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isAdminReview ? (
                              <button
                                onClick={() => setSelectedProject(project)}
                                className="text-indigo-600 font-bold hover:underline"
                              >
                                Review Now
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/project/${project.id}`)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            {selectedProject ? (
              <div className="bg-white rounded-xl shadow-xl border border-indigo-100 overflow-hidden sticky top-8 animate-in fade-in slide-in-from-right-4">
                <div className="bg-indigo-600 p-6 text-white">
                  <h3 className="font-bold text-lg">Project Evaluation</h3>
                  <p className="text-indigo-100 text-sm">{selectedProject.name}</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <RatingInput label="Problem Importance" value={ratings.problem_importance} onChange={(v) => handleRatingChange('problem_importance', v)} />
                    <RatingInput label="Technical Feasibility" value={ratings.technical_feasibility} onChange={(v) => handleRatingChange('technical_feasibility', v)} />
                    <RatingInput label="Market Demand" value={ratings.market_demand} onChange={(v) => handleRatingChange('market_demand', v)} />
                    <RatingInput label="Impact Potential" value={ratings.impact_potential} onChange={(v) => handleRatingChange('impact_potential', v)} />
                    <RatingInput label="Dev Complexity" value={ratings.development_complexity} onChange={(v) => handleRatingChange('development_complexity', v)} />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-gray-900">Innovation Score</span>
                      <span className="text-2xl font-black text-indigo-600">{calculateScore()}</span>
                    </div>
                    <textarea
                      placeholder="Admin notes and feedback..."
                      className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg h-24 focus:ring-2 focus:ring-indigo-500"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => handleAdminAction('completed')}
                      disabled={submitting}
                      className="flex items-center justify-center p-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Product
                    </button>
                    <button
                      onClick={() => handleAdminAction('active')}
                      disabled={submitting}
                      className="flex items-center justify-center p-3 border border-indigo-200 text-indigo-700 rounded-lg font-bold hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Return for Improvements
                    </button>
                    <button
                      onClick={() => handleAdminAction('rejected')}
                      disabled={submitting}
                      className="flex items-center justify-center p-3 border border-red-200 text-red-700 rounded-lg font-bold hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Reject Project
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a project in "Admin Review" stage to evaluate.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, isText }: { icon: React.ReactNode, label: string, value: any, isText?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
      <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center mr-4">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className={`${isText ? 'text-sm' : 'text-2xl'} font-black text-gray-900`}>{value}</p>
      </div>
    </div>
  );
}

function RatingInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-500 uppercase">{label}</span>
        <span className="text-indigo-600">{value}/10</span>
      </div>
      <input
        type="range" min="1" max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
}
