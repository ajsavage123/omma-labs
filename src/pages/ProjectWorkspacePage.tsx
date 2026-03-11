import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog, Designation } from '@/types';
import { PipelineBar } from '@/components/PipelineBar';
import { StageCard } from '@/components/StageCard';
import { ProjectInfoModal } from '@/components/ProjectInfoModal';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ChevronLeft, Info, Briefcase, Code, Microscope, Clock, ShieldAlert, ExternalLink } from 'lucide-react';

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();

  const [project, setProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Designation | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  const fetchData = async (projectId: string) => {
    try {
      const [projectData, logsData] = await Promise.all([
        projectService.getProjectById(projectId),
        projectService.getTimelineLogs(projectId)
      ]);
      setProject(projectData);
      setLogs(logsData);
    } catch {
      toast.error('Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0B]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4">
             <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-400 font-medium">Entering Workspace…</p>
        </div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const teamTools: Record<Designation, { name: string, url: string }[]> = {
    'Innovation & Research Team': [
      { name: 'Perplexity AI', url: 'https://www.perplexity.ai' },
      { name: 'ChatGPT', url: 'https://chat.openai.com' },
      { name: 'Claude AI', url: 'https://claude.ai' },
      { name: 'Miro', url: 'https://miro.com' },
      { name: 'Google Docs', url: 'https://docs.google.com' },
      { name: 'Figma', url: 'https://figma.com' },
    ],
    'Developer & Engineering Team': [
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'VS Code', url: 'https://vscode.dev' },
      { name: 'Postman', url: 'https://postman.com' },
      { name: 'Docker', url: 'https://docker.com' },
      { name: 'Supabase', url: 'https://supabase.com' },
      { name: 'Vercel', url: 'https://vercel.com' },
    ],
    'Business Strategy & Marketing Team': [
      { name: 'Canva', url: 'https://canva.com' },
      { name: 'Google Analytics', url: 'https://analytics.google.com' },
      { name: 'LinkedIn', url: 'https://linkedin.com' },
      { name: 'HubSpot', url: 'https://hubspot.com' },
      { name: 'Mailchimp', url: 'https://mailchimp.com' },
      { name: 'Linear', url: 'https://linear.app' },
    ]
  };

  const teamStages: Record<string, string[]> = {
    'Innovation & Research Team': ['ideology', 'research'],
    'Developer & Engineering Team': ['development', 'deployment'],
    'Business Strategy & Marketing Team': ['business', 'marketing']
  };

  const isAdminReviewing = project.project_stages.some((s: ProjectStage) => s.stage_name === 'admin_review' && s.status === 'in_progress');
  const isCompleted = project.status === 'completed';

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-5xl w-full">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-400 hover:text-indigo-400 mb-12 transition-colors font-medium text-sm bg-[#151518] border border-[#2F2F3B] px-4 py-2 rounded-xl shadow-sm hover:shadow-md"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </button>

          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-500/15 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 border border-indigo-500/20">Workspace Router</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">{project.name}</h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Select your department below to enter the focused workroom for this project.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
            <TeamCard
              name="Innovation & Research Team"
              icon={<Microscope className="h-8 w-8 text-blue-500" />}
              description="Focus on ideological foundation and market research phase."
              onClick={() => setSelectedTeam('Innovation & Research Team')}
              borderColor="hover:border-blue-500/50"
              bgHover="group-hover:bg-blue-500/10"
              isActive={project.project_stages.some(s => teamStages['Innovation & Research Team'].includes(s.stage_name) && s.status === 'in_progress')}
            />
            <TeamCard
              name="Developer & Engineering Team"
              icon={<Code className="h-8 w-8 text-indigo-500" />}
              description="Build, test, and deploy the core technology."
              onClick={() => setSelectedTeam('Developer & Engineering Team')}
              borderColor="hover:border-indigo-500/50"
              bgHover="group-hover:bg-indigo-500/10"
              isActive={project.project_stages.some(s => teamStages['Developer & Engineering Team'].includes(s.stage_name) && s.status === 'in_progress')}
            />
            <TeamCard
              name="Business Strategy & Marketing Team"
              icon={<Briefcase className="h-8 w-8 text-emerald-500" />}
              description="Plan marketing, sales channels, and collect customer feedback."
              onClick={() => setSelectedTeam('Business Strategy & Marketing Team')}
              borderColor="hover:border-emerald-500/50"
              bgHover="group-hover:bg-emerald-500/10"
              isActive={project.project_stages.some(s => teamStages['Business Strategy & Marketing Team'].includes(s.stage_name) && s.status === 'in_progress')}
            />
          </div>
        </div>
      </div>
    );
  }

  const visibleStages = project.project_stages.filter((s: ProjectStage) =>
    selectedTeam && teamStages[selectedTeam]?.includes(s.stage_name)
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="bg-[#121216] border-b border-[#1F1F26] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSelectedTeam(null)}
                className="mr-3 sm:mr-4 p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors flex-shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 pr-4">
                <h1 className="text-lg sm:text-2xl font-extrabold text-white truncate">{project.name}</h1>
                <p className="text-[10px] sm:text-xs text-indigo-400 font-bold uppercase tracking-widest truncate">{selectedTeam}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <a
                href={project.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
              >
                <ExternalLink className="h-4 w-4" />
                Open Project Drive
              </a>
              <button
                onClick={() => setInfoModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-200 rounded-xl hover:from-indigo-600 hover:to-indigo-700 hover:text-white transition-all shadow-lg border border-gray-700 hover:border-indigo-500/50 group"
                title="Project Details"
              >
                <Info className="h-4 w-4 text-indigo-400 group-hover:text-white transition-colors" />
                <span className="text-xs font-bold uppercase tracking-wider">Project Info</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <PipelineBar stages={project.project_stages} />

        {/* Admin Review Banner */}
        {isAdminReviewing && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start sm:items-center gap-4 shadow-sm animate-fade-in">
            <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Project Pending Admin Review</h4>
              <p className="text-xs text-amber-400/80 mt-0.5">The pipeline is complete. This project is currently locked while the administration team evaluates the final product.</p>
            </div>
          </div>
        )}

        {/* Completed Banner */}
        {isCompleted && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start sm:items-center gap-4 shadow-sm animate-fade-in">
            <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Project Completed</h4>
              <p className="text-xs text-emerald-400/80 mt-0.5">This project has been approved by admins and has successfully passed all pipeline stages.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12">
          {/* Main Workroom area (Stages) */}
          <div className="xl:col-span-2 space-y-6">
            <h3 className="font-extrabold text-xl text-white">Task Boards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {visibleStages.map((stage: ProjectStage) => (
                <StageCard
                  key={stage.id}
                  project={project}
                  stage={stage}
                  tools={selectedTeam ? teamTools[selectedTeam as Designation] : []}
                  onUpdate={() => fetchData(project.id)}
                  designation={user?.designation || selectedTeam || 'Innovation & Research Team'}
                  onToast={(msg: string, type: 'success' | 'error' | 'info') => toast[type](msg)}
                />
              ))}
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="xl:col-span-1">
            <h3 className="font-extrabold text-xl text-white mb-6 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-indigo-400" /> Project Timeline
            </h3>
            <div className="bg-[#121216] rounded-2xl shadow-md border border-[#1F1F26] p-6 sticky top-28">
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {logs.map((log: TimelineLog) => (
                  <div key={log.id} className="relative pl-6 pb-6 border-l-2 border-[#1F1F26] last:border-l-transparent last:pb-0 group">
                    <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-gray-600 ring-4 ring-[#121216] group-hover:bg-indigo-500 transition-colors" />
                    <div className="flex flex-col mb-1.5">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{log.user_name}</span>
                      <span className="text-[9px] text-gray-500 font-medium">
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">{log.update_text}</p>
                    <span className="mt-2 inline-flex border border-indigo-500/20 px-2 py-0.5 bg-indigo-500/10 rounded-md text-indigo-400 uppercase font-bold text-[8px] tracking-widest">
                      {log.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-8">No timeline updates yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {infoModalOpen && (
        <ProjectInfoModal project={project} onClose={() => setInfoModalOpen(false)} />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function TeamCard({ name, icon, description, onClick, borderColor, bgHover, isActive }: { name: string, icon: React.ReactNode, description: string, onClick: () => void, borderColor: string, bgHover: string, isActive?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#121216] p-6 sm:p-8 rounded-2xl shadow-md border ${isActive ? 'border-indigo-500 shadow-indigo-500/10' : 'border-[#1F1F26]'} ${borderColor} hover:shadow-xl transition-all duration-300 cursor-pointer group text-center flex flex-col relative overflow-hidden`}
    >
      {isActive && (
        <div className="absolute top-0 right-0">
          <div className="bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-lg uppercase tracking-tighter animate-pulse">
            Active Dept
          </div>
        </div>
      )}
      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-[#1A1A24] ${bgHover} transition-colors duration-300 ${isActive ? 'ring-2 ring-indigo-500/30' : ''}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
      <p className="text-sm text-gray-400 mb-8 flex-1">{description}</p>
      <div className={`inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[#1A1A24] text-gray-300 group-hover:bg-indigo-600 group-hover:text-white'}`}>
        Enter Workroom <ChevronLeft className="ml-1 h-4 w-4 rotate-180" />
      </div>
    </div>
  );
}
