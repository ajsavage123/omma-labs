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
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'team'>('dashboard');
  
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<(Project & { project_stages: ProjectStage[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Team Management State
  const [members, setMembers] = useState<User[]>([]);
  const [activeInvites, setActiveInvites] = useState<Invitation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [newInviteData, setNewInviteData] = useState({
    role: 'partner' as const,
    designation: 'Innovation & Research Team'
  });
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberData, setEditMemberData] = useState({
    role: 'partner' as 'admin' | 'partner',
    designation: 'Innovation & Research Team'
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
      } else {
        const [membersData, invitesData] = await Promise.all([
          adminService.getTeamMembers(user.workspace_id),
          adminService.getActiveInvitations(user.workspace_id)
        ]);
        setMembers(membersData);
        setActiveInvites(invitesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!user?.workspace_id) return;
    setGenerating(true);
    try {
      const invite = await adminService.generateInvite(
        newInviteData.role,
        newInviteData.designation,
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

  const handleUpdateMember = async (memberId: string) => {
    try {
      await adminService.updateUserRole(memberId, editMemberData.designation, editMemberData.role);
      setEditingMember(null);
      await fetchData();
    } catch (error) {
       console.error("Failed to update user", error);
       alert("Failed to update user. Please try again.");
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

      <header className="bg-[#111827]/80 backdrop-blur-md border-b border-white/10 px-8 py-4 flex justify-between items-center relative z-10 sticky top-0">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="mr-4 p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Innovation Dashboard</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Admin Control Center</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Project Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Team Management
          </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full relative z-10">
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
                                  project.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {project.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {isAdminReview ? (
                                  <button
                                    onClick={() => {
                                      setSelectedProject(project);
                                      setActionError(null);
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 font-semibold transition-colors text-xs border border-indigo-500/20"
                                  >
                                    Review Now
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/project/${project.id}`)}
                                    className="text-gray-500 hover:text-gray-300 transition-colors text-xs font-medium"
                                  >
                                    View Details
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
                  <div className="bg-[#111827]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-indigo-500/20 overflow-hidden sticky top-28 transform transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-8 relative">
                    {/* Glowing border top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500"></div>
                    
                    <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/20 p-6 border-b border-white/5">
                      <div className="flex items-center justify-between mb-2">
                         <h3 className="font-bold text-lg text-white">Project Evaluation</h3>
                         <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">Review Mode</span>
                      </div>
                      <p className="text-gray-400 text-sm">{selectedProject.name}</p>
                    </div>

                    <div className="p-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                      
                      {actionError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start text-red-400 animate-in fade-in">
                          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                          <div className="text-sm font-medium">{actionError}</div>
                        </div>
                      )}

                      <div className="space-y-5">
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
                        <button
                          onClick={() => handleAdminAction('active')}
                          disabled={submitting}
                          className="flex items-center justify-center p-3.5 bg-[#1f2937]/50 border border-indigo-500/30 text-indigo-300 rounded-xl font-bold hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-indigo-200 disabled:opacity-50 transition-all"
                        >
                          <RefreshCcw className="mr-2 h-5 w-5" /> Return for Improvements
                        </button>
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center text-lg tracking-tight">
                    Workspace Members
                  </h3>
                </div>
                <div className="p-6">
                  {members.map(member => (
                    <div key={member.id} className="p-4 bg-black/20 rounded-xl border border-white/5 mb-3 group hover:bg-white/5 transition-colors">
                      {editingMember === member.id ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30 text-xs">
                                  {member.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <p className="font-bold text-gray-200 text-sm">{member.username}</p>
                                </div>
                             </div>
                             <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleUpdateMember(member.id)}
                                  className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded hover:bg-indigo-500/40 transition-colors"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setEditingMember(null)}
                                  className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 text-xs font-bold rounded hover:bg-white/10 transition-colors"
                                >
                                  Cancel
                                </button>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Designation</label>
                               <select 
                                 value={editMemberData.designation}
                                 onChange={(e) => setEditMemberData({...editMemberData, designation: e.target.value as any})}
                                 className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-gray-200 outline-none focus:border-indigo-500/50"
                               >
                                  <option value="Innovation & Research Team">Innovation & Research Team</option>
                                  <option value="Developer & Engineering Team">Developer & Engineering Team</option>
                                  <option value="Business Strategy & Marketing Team">Business Strategy & Marketing Team</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Role</label>
                               <select 
                                 value={editMemberData.role}
                                 onChange={(e) => setEditMemberData({...editMemberData, role: e.target.value as any})}
                                 className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-xs text-gray-200 outline-none focus:border-indigo-500/50"
                               >
                                  <option value="partner">Partner</option>
                                  <option value="admin">Admin</option>
                               </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                              {member.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <p className="font-bold text-gray-200 group-hover:text-white transition-colors">{member.username}</p>
                              <p className="text-xs text-indigo-400 font-medium">{member.designation}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center space-x-3">
                             <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase bg-white/5 text-gray-400 rounded border border-white/10">
                               {member.role}
                             </span>
                             <button
                               onClick={() => {
                                  setEditingMember(member.id);
                                  setEditMemberData({
                                    designation: member.designation,
                                    role: member.role as 'admin' | 'partner'
                                  });
                               }}
                               className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs border border-white/5"
                             >
                               Edit
                             </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-8">
               <div className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                  <h3 className="font-bold text-white mb-4">Generate Invite Link</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Assign Designation</label>
                      <select 
                        value={newInviteData.designation}
                        onChange={(e) => setNewInviteData({...newInviteData, designation: e.target.value as any})}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                      >
                        <option value="Innovation & Research Team">Innovation & Research Team</option>
                        <option value="Developer & Engineering Team">Developer & Engineering Team</option>
                        <option value="Business Strategy & Marketing Team">Business Strategy & Marketing Team</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Assign Role</label>
                      <select 
                        value={newInviteData.role}
                        onChange={(e) => setNewInviteData({...newInviteData, role: e.target.value as any})}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/50 outline-none"
                      >
                        <option value="partner">Partner</option>
                        <option value="admin">Administrator (Admin Dashboard Access)</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={handleGenerateInvite}
                      disabled={generating}
                      className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-3 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Create Invite Code'}
                    </button>
                  </div>
               </div>

               {activeInvites.length > 0 && (
                 <div className="bg-[#111827]/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/5 p-6">
                    <h3 className="font-bold text-white mb-4 text-sm text-gray-400">Pending Invitations</h3>
                    <div className="space-y-3">
                      {activeInvites.map(invite => (
                        <div key={invite.id} className="bg-black/20 border border-white/5 rounded-lg p-3 group">
                          <div className="flex justify-between items-start mb-2">
                             <div className="font-mono text-indigo-400 text-sm tracking-widest font-bold bg-indigo-500/10 px-2 py-1 rounded inline-block">
                               {invite.code}
                             </div>
                             <span className="text-[10px] text-gray-500 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">Pending</span>
                          </div>
                          <p className="text-xs text-gray-400">{invite.designation}</p>
                        </div>
                      ))}
                    </div>
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

