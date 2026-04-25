import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { projectService } from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import type { Project, ProjectStage, User, Invitation } from '@/types';
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
  RefreshCcw,
  AlertTriangle,
  Trash2,
  X,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OomaLogo } from '@/components/OomaLogo';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const DEPARTMENTS = [
  'Innovation & Research Team',
  'Developer & Engineering Team',
  'Business Strategy & Marketing Team'
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'access'>('dashboard');
  
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Team Management State
  const [members, setMembers] = useState<User[]>([]);
  const [activeInvites, setActiveInvites] = useState<Invitation[]>([]);
  const [pendingAccess, setPendingAccess] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [newInviteData, setNewInviteData] = useState({
    role: 'partner' as const,
    designations: ['Innovation & Research Team']
  });
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberData, setEditMemberData] = useState({
    role: 'partner' as 'admin' | 'partner',
    designations: [] as string[]
  });

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

  // Send Back State
  const [showSendBack, setShowSendBack] = useState(false);
  const [sendBackStage, setSendBackStage] = useState<string>('');

  useEffect(() => {
    if (user?.workspace_id) {
      fetchData();
    }
  }, [user?.workspace_id, activeTab]);

  const fetchData = async () => {
    if (!user?.workspace_id) return;
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const [statsData, projectsData] = await Promise.all([
          adminService.getAdminStats(),
          projectService.getProjects()
        ]);
        setStats(statsData);
        setProjects(projectsData);
      } else if (activeTab === 'team') {
        const [membersData, invitesData] = await Promise.all([
          adminService.getTeamMembers(user.workspace_id),
          adminService.getActiveInvitations(user.workspace_id)
        ]);
        setMembers(membersData);
        setActiveInvites(invitesData);
      } else if (activeTab === 'access') {
        const { crmAccessService } = await import('@/services/crmAccessService');
        const requests = await crmAccessService.getPendingRequests(user.workspace_id);
        setPendingAccess(requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAccess = async (requestId: string, approve: boolean) => {
    try {
      const { crmAccessService } = await import('@/services/crmAccessService');
      await crmAccessService.updateRequestStatus(requestId, approve ? 'approved' : 'rejected');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to process request.");
    }
  };

  const handleGenerateInvite = async () => {
    if (!user?.workspace_id || newInviteData.designations.length === 0) {
      alert("Please select at least one department.");
      return;
    }
    setGenerating(true);
    try {
      const invite = await adminService.generateInvite(
        newInviteData.role,
        newInviteData.designations.join(', '),
        user.workspace_id
      );
      
      // Copy to clipboard
      await navigator.clipboard.writeText(invite.code);
      alert(`Invite created and code copied to clipboard: ${invite.code}`);
      
      // Refresh invites
      await fetchData();
    } catch (err) {
      console.error('Failed to create invite', err);
      alert('Failed to generate invite code. Check console.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!window.confirm("Are you sure you want to delete this invitation?")) return;
    try {
      await adminService.deleteInvite(inviteId);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete invite", error);
      alert("Failed to delete invitation.");
    }
  };

  const handleUpdateMember = async (memberId: string) => {
    if (editMemberData.designations.length === 0) {
      alert("Please select at least one department.");
      return;
    }
    try {
      await adminService.updateUserProfile(memberId, { 
        designation: editMemberData.designations.join(', '), 
        role: editMemberData.role 
      });
      setEditingMember(null);
      await fetchData();
    } catch (error) {
       console.error("Failed to update user", error);
       alert("Failed to update user. Please try again.");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (memberId === user?.id) {
       alert("You cannot delete your own account.");
       return;
    }
    if (!window.confirm("Are you sure you want to remove this user from the workspace?")) return;
    try {
      await adminService.deleteUser(memberId);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete user", err);
      alert("Failed to delete user. Please check permissions.");
    }
  };


  const handleRatingChange = (field: string, value: number) => {
    setRatings(prev => ({ ...prev, [field]: value }));
  };

  const calculateScore = () => {
    const vals = Object.values(ratings);
    if (vals.length === 0) return '0.0';
    const sum = vals.reduce((a, b) => a + b, 0);
    const average = sum / vals.length;
    return (isNaN(average) ? 0 : average).toFixed(1);
  };

  const handleAdminAction = async (status: 'completed' | 'active' | 'rejected') => {
    if (!selectedProject) return;
    setSubmitting(true);
    setActionError(null);
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
      setNotes('');
      setShowSendBack(false);
      setSendBackStage('');
      setRatings({
        problem_importance: 5,
        technical_feasibility: 5,
        market_demand: 5,
        impact_potential: 5,
        development_complexity: 5,
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to submit evaluation. Please make sure all data is correct and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!selectedProject || !sendBackStage || !selectedProject.workspace_id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await projectService.sendBackToStage(
        selectedProject.id,
        selectedProject.workspace_id,
        sendBackStage as any,
        notes,
        selectedProject.project_type
      );
      setSelectedProject(null);
      setNotes('');
      setShowSendBack(false);
      setSendBackStage('');
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send back project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      await adminService.deleteProject(projectId);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete project', err);
      alert('Failed to delete project.');
    }
  };

  const handleToggleCodeRed = async (project: Project) => {
    if (!user?.workspace_id) return;
    const isCodeRed = project.status === 'code_red';
    const msg = isCodeRed 
      ? `Are you sure you want to lift Code Red from "${project.name}" and unpause all other projects?`
      : `Are you sure you want to declare CODE RED on "${project.name}"? This will pause all other active projects in the workspace instantly.`;
      
    if (!window.confirm(msg)) return;
    
    try {
      await adminService.toggleCodeRed(project.id, user.workspace_id, !isCodeRed);
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle code red', err);
      alert('Action failed.');
    }
  };

  const toggleDeptForInvite = (dept: string) => {
    setNewInviteData(prev => ({
      ...prev,
      designations: prev.designations.includes(dept) 
        ? prev.designations.filter(d => d !== dept) 
        : [...prev.designations, dept]
    }));
  };

  const toggleDeptForEdit = (dept: string) => {
    setEditMemberData(prev => ({
      ...prev,
      designations: prev.designations.includes(dept) 
        ? prev.designations.filter(d => d !== dept) 
        : [...prev.designations, dept]
    }));
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0f1c] z-50">
      <div className="flex flex-col items-center relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
        <p className="text-indigo-200 font-medium animate-pulse tracking-wide relative z-10">Initializing Data Center...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col font-sans text-gray-200 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <header className="fixed top-0 left-0 right-0 z-[60] bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 shrink-0 transition-all flex items-center justify-between px-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 active:scale-90 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <OomaLogo size={28} />
            <h1 className="text-[15px] font-black tracking-tight uppercase text-white">Admin Dashboard</h1>
          </div>
          <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-0.5">Control Center</p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 hidden sm:flex">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'team' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Teams
          </button>
          <button 
            onClick={() => setActiveTab('access')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'access' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Access
          </button>
        </div>
        
        {/* Mobile Spacer if tabs hidden */}
        <div className="w-10 sm:hidden"></div>
      </header>

      {/* Mobile Tab Switcher - only on small screens */}
      <div className="sm:hidden fixed top-16 left-0 right-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-md border-b border-white/5 p-2 flex gap-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}
        >
          Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'team' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}
        >
          Teams
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'access' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}
        >
          Access
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pt-28 sm:pt-20 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full relative z-10">
        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
              <StatCard icon={<BarChart3 className="text-indigo-400" />} label="Active Projects" value={stats?.activeProjects || 0} />
              <StatCard icon={<Search className="text-blue-400" />} label="Research Phase" value={stats?.researchCount || 0} />
              <StatCard icon={<Code className="text-purple-400" />} label="Development" value={stats?.developmentCount || 0} />
              <StatCard icon={<Rocket className="text-emerald-400" />} label="Launch Phase" value={stats?.launchCount || 0} />
              <StatCard icon={<Activity className="text-orange-400" />} label="Most Active" value={stats?.mostActiveTeam || 'N/A'} isText />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Projects Table */}
              <div className="lg:col-span-2">
                <div className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/5">
                    <h3 className="font-bold text-white flex items-center text-lg tracking-tight">
                      <Activity className="mr-3 h-5 w-5 text-indigo-400" />
                      Project Pipeline Overview
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-black/20 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Current Stage</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {projects.map(project => {
                          const currentStage = project.project_stages?.find(s => s.status === 'in_progress')?.stage_name || 'N/A';
                          const isAdminReview = currentStage === 'admin_review';

                          return (
                             <tr key={project.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4 font-semibold text-gray-200 group-hover:text-white transition-colors">{project.name}</td>
                              <td className="px-6 py-4 capitalize text-gray-400">{currentStage.replace('_', ' ')}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border ${
                                  project.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                  project.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                  project.status === 'code_red' ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.7)]' : 
                                  project.status === 'paused' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' :
                                  'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                  {project.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                               <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        setSelectedProject(project);
                                        setActionError(null);
                                      }}
                                      className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs border ${
                                        isAdminReview 
                                          ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20' 
                                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/10'
                                      }`}
                                    >
                                      {isAdminReview ? 'Review' : 'Manage'}
                                    </button>
                                    <button
                                      onClick={() => navigate(`/project/${project.id}`)}
                                      className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-medium"
                                    >
                                      View
                                    </button>
                                  <button
                                    onClick={() => handleToggleCodeRed(project)}
                                    className={`p-1.5 transition-colors rounded-lg flex items-center justify-center ${project.status === 'code_red' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'text-gray-600 hover:text-red-500 hover:bg-red-500/10'}`}
                                    title={project.status === 'code_red' ? "Lift Code Red" : "Declare Code Red"}
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                    title="Delete Project"
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

              {/* Review Panel */}
              <div className="lg:col-span-1">
                {selectedProject ? (
                  <div className="bg-[#111827]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-indigo-500/20 overflow-hidden sticky top-28 transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-8 relative">
                    {/* Glowing border top */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                      selectedProject.status === 'code_red' ? 'from-red-600 via-red-500 to-red-600' : 'from-indigo-500 via-blue-500 to-purple-500'
                    }`}></div>
                    
                    <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/20 p-6 border-b border-white/5 relative">
                      <button 
                        onClick={() => setSelectedProject(null)} 
                        className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="flex items-center justify-between mb-2 pr-8">
                         <h3 className="font-bold text-lg text-white">
                           {selectedProject.project_stages?.find(s => s.status === 'in_progress')?.stage_name === 'admin_review' 
                             ? 'Project Evaluation' 
                             : 'Project Management'}
                         </h3>
                         <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                           {selectedProject.project_stages?.find(s => s.status === 'in_progress')?.stage_name === 'admin_review' 
                             ? 'Review Mode' 
                             : 'Management Mode'}
                         </span>
                      </div>
                      <p className="text-gray-400 text-sm">{selectedProject.name}</p>
                    </div>

                    <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                      
                      {actionError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-400 animate-in fade-in mb-4">
                          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                          <div className="text-sm font-medium">{actionError}</div>
                        </div>
                      )}

                      {/* Radar Chart */}
                      <div className="h-52 w-full mb-6 bg-black/20 rounded-xl border border-white/5 pt-4 pb-2 shadow-inner">
                        <ResponsiveContainer width="100%" height={200}>
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                            { subject: 'Importance', A: ratings.problem_importance, fullMark: 10 },
                            { subject: 'Feasibility', A: ratings.technical_feasibility, fullMark: 10 },
                            { subject: 'Demand', A: ratings.market_demand, fullMark: 10 },
                            { subject: 'Impact', A: ratings.impact_potential, fullMark: 10 },
                            { subject: 'Complexity', A: ratings.development_complexity, fullMark: 10 },
                          ]}>
                            <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} fill="#6366f1" tick={false} axisLine={false} />
                            <Radar name="Project" dataKey="A" stroke="#818cf8" strokeWidth={2} fill="#6366f1" fillOpacity={0.3} dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-4">
                        <RatingInput label="Problem Importance" value={ratings.problem_importance} onChange={(v) => handleRatingChange('problem_importance', v)} />
                        <RatingInput label="Technical Feasibility" value={ratings.technical_feasibility} onChange={(v) => handleRatingChange('technical_feasibility', v)} />
                        <RatingInput label="Market Demand" value={ratings.market_demand} onChange={(v) => handleRatingChange('market_demand', v)} />
                        <RatingInput label="Impact Potential" value={ratings.impact_potential} onChange={(v) => handleRatingChange('impact_potential', v)} />
                        <RatingInput label="Dev Complexity" value={ratings.development_complexity} onChange={(v) => handleRatingChange('development_complexity', v)} />
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4 bg-black/20 p-4 rounded-xl border border-white/5">
                          <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Innovation Score</span>
                          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 drop-shadow-sm">{calculateScore()}</span>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Admin Notes</label>
                          <textarea
                            placeholder="Provide detailed feedback for the team..."
                            className="w-full p-4 text-sm bg-black/40 border border-white/10 rounded-xl h-28 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-gray-600 transition-all custom-scrollbar"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {selectedProject.project_stages?.find(s => s.status === 'in_progress')?.stage_name === 'admin_review' && (
                          <button
                            onClick={() => handleAdminAction('completed')}
                            disabled={submitting}
                            className="group flex items-center justify-center p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all"
                          >
                            {submitting ? (
                              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <><CheckCircle2 className="mr-2 h-5 w-5 text-indigo-200 group-hover:text-white transition-colors" /> Approve Product</>
                            )}
                          </button>
                        )}
                        {/* Send Back to Stage — Expandable */}
                        <div className="border border-amber-500/20 rounded-xl overflow-hidden">
                          <button
                            onClick={() => { setShowSendBack(!showSendBack); setSendBackStage(''); }}
                            className="w-full flex items-center justify-between p-3.5 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-bold transition-all text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <RefreshCcw className="h-4 w-4" />
                              Send Back to Stage
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-amber-500/60">{showSendBack ? 'Cancel ↑' : 'Pick Stage ↓'}</span>
                          </button>

                          {showSendBack && (
                            <div className="p-4 bg-black/20 border-t border-amber-500/10 space-y-3">
                              <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-widest">Select the stage to rollback to:</p>
                              <select
                                value={sendBackStage}
                                onChange={(e) => setSendBackStage(e.target.value)}
                                className="w-full bg-black/40 border border-amber-500/20 rounded-lg p-2.5 text-sm text-gray-200 outline-none focus:border-amber-500/50"
                              >
                                <option value="">-- Choose Stage --</option>
                                {(selectedProject.project_type === 'client'
                                  ? [
                                      ['discovery', 'Client Discovery'],
                                      ['proposals_contracts', 'Contracts & Proposals'],
                                      ['ui_ux_design', 'UI/UX Design'],
                                      ['client_approval', 'Client Approval'],
                                      ['development', 'Development'],
                                      ['qa_testing', 'QA & Testing'],
                                      ['client_uat', 'Client UAT'],
                                      ['deployment', 'Deployment'],
                                      ['maintenance_support', 'Maintenance & Support'],
                                      ['admin_review', 'Admin Review'],
                                    ]
                                  : [
                                      ['ideology', 'Ideology & Concept'],
                                      ['research', 'Research'],
                                      ['development', 'Development'],
                                      ['deployment', 'Deployment'],
                                      ['business', 'Business Strategy'],
                                      ['marketing', 'Marketing'],
                                      ['admin_review', 'Admin Review'],
                                    ]
                                ).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>

                              <button
                                onClick={handleSendBack}
                                disabled={submitting || !sendBackStage}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl font-bold text-sm hover:bg-amber-500/20 disabled:opacity-40 transition-all"
                              >
                                <RefreshCcw className="h-4 w-4" />
                                {submitting ? 'Sending Back...' : `Return to ${sendBackStage ? (sendBackStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : 'Stage'}`}
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleAdminAction('rejected')}
                          disabled={submitting}
                          className="flex items-center justify-center p-3.5 bg-[#1f2937]/50 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 disabled:opacity-50 transition-all"
                        >
                          <XCircle className="mr-2 h-5 w-5" /> Reject Project
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111827]/40 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/10 p-16 text-center text-gray-500 flex flex-col items-center justify-center h-full min-h-[400px]">
                    <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                      <Star className="h-8 w-8 text-indigo-500/40" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-300 mb-2">No Project Selected</h3>
                    <p className="text-sm max-w-[250px] leading-relaxed">Select a project currently in the <span className="text-indigo-400 font-semibold px-1">Admin Review</span> stage from the pipeline overview to start evaluation.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'team' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Directory - 2/3 width */}
            <div className="lg:col-span-2">
              <div className="bg-[#111827]/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-transparent flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Workspace Registry</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-[10px] text-indigo-400/70 uppercase tracking-[0.2em] font-black">Authorized Personnel Only</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-white/10 tracking-tighter leading-none">{members.length}</span>
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Active Profiles</span>
                  </div>
                </div>
                
                <div className="p-8 space-y-12 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-4">
                  
                  {DEPARTMENTS.map(deptCategory => (
                    <div key={deptCategory} className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center border 
                          ${deptCategory.includes('Innovation') ? 'bg-indigo-500/10 border-indigo-500/20' : 
                            deptCategory.includes('Developer') ? 'bg-emerald-500/10 border-emerald-500/20' : 
                            deptCategory.includes('Business') ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}
                        `}>
                          <span className={`h-2.5 w-2.5 rounded-full 
                            ${deptCategory.includes('Innovation') ? 'bg-indigo-500' : 
                              deptCategory.includes('Developer') ? 'bg-emerald-500' : 
                              deptCategory.includes('Business') ? 'bg-amber-500' : 'bg-gray-500'}
                          `}></span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">{deptCategory.replace(' Team', '')}</h4>
                        <span className="ml-auto text-[10px] font-black text-gray-500 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                          {members.filter(m => m.designation.includes(deptCategory)).length} Members
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {members.filter(m => m.designation.includes(deptCategory)).length > 0 ? (
                          members.filter(m => m.designation.includes(deptCategory)).map(member => (
                            <div key={member.id} className="relative group h-full">
                              {editingMember === member.id ? (
                                <div className="bg-[#0c0c0e] rounded-2xl border border-indigo-500/50 p-5 shadow-[0_0_15px_rgba(99,102,241,0.2)] h-full flex flex-col justify-center">
                                  <h4 className="font-black text-white mb-4">Manage Profile</h4>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-2">Assign Departments</label>
                                      <div className="grid grid-cols-1 gap-1.5 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                                        {DEPARTMENTS.map(dept => (
                                          <label key={dept} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded transition-colors group/dept">
                                            <input 
                                              type="checkbox" 
                                              checked={editMemberData.designations.includes(dept)}
                                              onChange={() => toggleDeptForEdit(dept)}
                                              className="rounded border-white/20 bg-black text-indigo-500 focus:ring-0 h-3 w-3"
                                            />
                                            <span className="text-[10px] font-bold text-gray-400 group-hover/dept:text-white">{dept.replace(' Team', '')}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-1">Platform Role</label>
                                      <select value={editMemberData.role} onChange={(e) => setEditMemberData({...editMemberData, role: e.target.value as 'admin' | 'partner'})} disabled={member.id === user?.id} className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white disabled:opacity-50 outline-none focus:border-indigo-500/50">
                                        <option value="partner">Partner</option>
                                        <option value="admin">Admin</option>
                                      </select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                      <button onClick={() => handleUpdateMember(member.id)} className="flex-1 bg-indigo-500 text-white py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Execute Update</button>
                                      <button onClick={() => setEditingMember(null)} className="flex-1 bg-white/5 text-gray-400 py-2 rounded-lg text-xs font-black uppercase tracking-widest border border-white/5 hover:bg-white/10 hover:text-white transition-all">Cancel</button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                                  <div className="relative bg-[#0c0c0e] rounded-2xl border border-white/10 p-5 flex flex-col h-full shadow-xl transition-all duration-500 group-hover:-translate-y-1">
                                    <div className="flex items-start justify-between mb-5">
                                      <div className="flex items-center gap-3">
                                        <div className="relative">
                                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-lg border border-white/5 shadow-inner transition-transform duration-500 group-hover:rotate-3 
                                            ${deptCategory.includes('Innovation') ? 'bg-indigo-500/20' : 
                                              deptCategory.includes('Developer') ? 'bg-emerald-500/20' : 
                                              deptCategory.includes('Business') ? 'bg-amber-500/20' : 'bg-white/5'}
                                          `}>
                                            {member.username.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c0e] ${member.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                        </div>
                                        <div>
                                          <h4 className="font-black text-white text-base tracking-tight">{member.username}</h4>
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {member.designation.split(', ').map((d, idx) => (
                                              <span key={idx} className="text-[7px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-1 rounded border border-indigo-500/20">{d.replace(' Team', '')}</span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <button title="Manage Profile" onClick={() => { setEditingMember(member.id); setEditMemberData({ designations: member.designation.split(', '), role: member.role as 'admin' | 'partner' }); }} className="p-1.5 bg-white/5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all border border-white/5"><Edit2 className="h-3.5 w-3.5" /></button>
                                        {member.id !== user?.id && (
                                          <button onClick={() => handleDeleteMember(member.id)} className="p-1.5 bg-white/5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"><Trash2 className="h-3.5 w-3.5" /></button>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border ${member.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                                        {member.role === 'admin' ? 'Admin' : 'Partner'}
                                      </span>
                                      <span className="text-[8px] font-mono text-white/20">#{member.id.substring(0, 8)}</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-1 sm:col-span-2 p-8 bg-black/20 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">No active personnel in this department</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </div>

            {/* Side Panel - 1/3 width */}
            <div className="lg:col-span-1 space-y-8">
               <div className="bg-[#111827]/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/5 p-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                  <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Onboard Member</h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-3">Assign Departments</label>
                      <div className="space-y-2 bg-black/40 border border-white/10 rounded-xl p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {DEPARTMENTS.map(dept => (
                          <label key={dept} className="flex items-center gap-3 cursor-pointer group/dept">
                            <input 
                              type="checkbox" 
                              checked={newInviteData.designations.includes(dept)}
                              onChange={() => toggleDeptForInvite(dept)}
                              className="rounded border-white/20 bg-black text-emerald-500 focus:ring-0 h-4 w-4"
                            />
                            <span className="text-xs font-bold text-gray-400 group-hover/dept:text-white transition-colors">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Workspace Role</label>
                      <select 
                        value={newInviteData.role}
                        onChange={(e) => setNewInviteData({...newInviteData, role: e.target.value as any})}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                      >
                        <option value="partner">Partner (Collaborator)</option>
                        <option value="admin">Administrator (Full Access)</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={handleGenerateInvite}
                      disabled={generating || newInviteData.designations.length === 0}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {generating ? 'Generating Security Key...' : 'Generate Invite Link'}
                    </button>
                  </div>
               </div>

               {activeInvites.length > 0 && (
                 <div className="bg-[#111827]/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/5 p-8">
                    <h3 className="font-black text-gray-500 mb-6 text-xs uppercase tracking-widest flex justify-between items-center">
                      Active Invitations
                      <span className="bg-white/5 px-2 py-0.5 rounded text-[9px]">{activeInvites.length}</span>
                    </h3>
                    <div className="space-y-4">
                      {activeInvites.map(invite => (
                        <div key={invite.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 group">
                          <div className="flex justify-between items-start mb-3">
                             <div className="font-mono text-indigo-400 text-sm tracking-widest font-black bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                               {invite.code}
                             </div>
                             <button 
                               onClick={() => handleDeleteInvite(invite.id)}
                               className="p-2 bg-white/5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
                             >
                               <Trash2 className="h-3.5 w-3.5" />
                             </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                             {invite.designation.split(', ').map((d, i) => (
                               <span key={i} className="text-[7px] text-gray-400 font-bold uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{d.replace(' Team', '')}</span>
                             ))}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h3 className="font-bold text-white flex items-center text-lg tracking-tight">
                <ShieldAlert className="mr-3 h-5 w-5 text-amber-500" />
                CRM Access Requests
              </h3>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Review authorization requests for Developers & Engineers</p>
            </div>
            <div className="p-6">
              {pendingAccess.length > 0 ? (
                <div className="space-y-4">
                  {pendingAccess.map(request => (
                    <div key={request.id} className="p-5 bg-black/40 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-white/5 transition-all">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 font-bold">
                          {request.users?.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <p className="font-bold text-white text-lg">{request.users?.username}</p>
                          <p className="text-xs text-indigo-400 font-medium">{request.users?.designation}</p>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">Requested: {new Date(request.requested_at).toLocaleDateString()} {new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => handleApproveAccess(request.id, true)}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600/10 text-green-400 border border-green-600/20 rounded-xl font-bold text-xs hover:bg-green-600/20 transition-all uppercase tracking-widest"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveAccess(request.id, false)}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600/10 text-red-400 border border-red-600/20 rounded-xl font-bold text-xs hover:bg-red-600/20 transition-all uppercase tracking-widest"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5 opacity-50">
                    <CheckCircle2 className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-300">Queue is Clear</h3>
                  <p className="text-sm text-gray-600 mt-1 max-w-xs mx-auto uppercase tracking-widest font-black">No pending CRM access requests at this time.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon, label, value, isText }: { icon: React.ReactNode, label: string, value: any, isText?: boolean }) {
  return (
    <div className="bg-[#111827]/60 backdrop-blur-xl p-6 rounded-2xl shadow-lg border border-white/5 flex items-center hover:bg-[#111827]/80 transition-all duration-300 group">
      <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mr-5 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className={`${isText ? 'text-sm' : 'text-3xl'} font-black text-gray-100 tracking-tight`}>{value}</p>
      </div>
    </div>
  );
}

function RatingInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2 bg-black/20 p-3.5 rounded-xl border border-white/5">
      <div className="flex justify-between text-xs font-bold items-end">
        <span className="text-gray-400 tracking-wide">{label}</span>
        <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px] border border-indigo-500/20">{value} <span className="text-indigo-500/50">/ 10</span></span>
      </div>
      <div className="relative pt-1">
        <input
          type="range" min="1" max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="flex justify-between text-[8px] text-gray-600 mt-1.5 px-0.5 font-bold uppercase tracking-wider">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
