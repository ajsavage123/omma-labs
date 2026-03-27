import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog, Designation } from '@/types';
import { PipelineBar } from '@/components/PipelineBar';
import { StageCard } from '@/components/StageCard';
import { ProjectInfoModal } from '@/components/ProjectInfoModal';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ChevronLeft, Info, Briefcase, Code, Clock, Sparkles, ShieldAlert, Microscope } from 'lucide-react';

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

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6366f1]"></div>
    </div>
  );
  if (!project) return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-gray-500 font-bold">Project not found</div>;

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

  const currentActiveStage = project.project_stages.find(s => s.status === 'in_progress')?.stage_name;
  const getActiveTeam = (): Designation | null => {
    if (!currentActiveStage) return null;
    if (['ideology', 'research'].includes(currentActiveStage)) return 'Innovation & Research Team';
    if (['development', 'deployment'].includes(currentActiveStage)) return 'Developer & Engineering Team';
    if (['business', 'marketing'].includes(currentActiveStage)) return 'Business Strategy & Marketing Team';
    return null;
  };
  const highlightedTeam = getActiveTeam();
  const isAdminReviewing = project.project_stages.some((s) => s.stage_name === 'admin_review' && s.status === 'in_progress');
  const isCompleted = project.status === 'completed';

  if (!selectedTeam) {
    return (
      <div className="h-screen relative overflow-hidden bg-[#050505] flex flex-col font-sans">
        <div className={`absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${
          project.status === 'code_red' ? 'bg-red-500/10' : 'bg-indigo-500/5'
        }`}></div>
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${
          project.status === 'code_red' ? 'bg-red-600/10' : 'bg-purple-500/5'
        }`}></div>

        {/* Fixed Header */}
        <div className="flex-none p-4 md:p-6 sticky top-0 bg-[#050505]/95 backdrop-blur-xl z-20 border-b border-white/5 flex items-center">
           <button onClick={() => navigate('/')} className="inline-flex items-center text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-3 rounded-2xl transition-colors active:scale-95 shadow-md">
             <ChevronLeft className="mr-2 h-4 w-4" strokeWidth={3} />
             Back to Dashboard
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 scroll-smooth scrollbar-hide">
          <div className="max-w-5xl mx-auto w-full pt-4 md:pt-10">
             <div className="text-center mb-8 md:mb-16">
                <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] mb-4 md:mb-6">
                  Workspace Router
                </div>
                <h1 className="text-2xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                  <Sparkles className="h-5 w-5 md:h-8 md:w-8 text-[#f59e0b] animate-pulse" />
                  {project.name}
                </h1>
                <p className="text-gray-400 font-bold text-[10px] md:text-base px-5 uppercase tracking-widest opacity-60">Select Department</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <TeamCard
                  name="Innovation & Research"
                  icon={<Microscope className="h-7 w-7 md:h-8 md:w-8 text-cyan-400" />}
                  description="Idea validation & conceptual research."
                  isHighlighted={highlightedTeam === 'Innovation & Research Team'}
                  onClick={() => setSelectedTeam('Innovation & Research Team')}
                  colorClass="cyan"
                />
                <TeamCard
                  name="Engineering Group"
                  icon={<Code className="h-7 w-7 md:h-8 md:w-8 text-indigo-400" />}
                  description="Technical architecture & development."
                  isHighlighted={highlightedTeam === 'Developer & Engineering Team'}
                  onClick={() => setSelectedTeam('Developer & Engineering Team')}
                  colorClass="indigo"
                />
                <TeamCard
                  name="Strategy & Marketing"
                  icon={<Briefcase className="h-7 w-7 md:h-8 md:w-8 text-emerald-400" />}
                  description="Business scaling & marketing growth."
                  isHighlighted={highlightedTeam === 'Business Strategy & Marketing Team'}
                  onClick={() => setSelectedTeam('Business Strategy & Marketing Team')}
                  colorClass="emerald"
                />
             </div>
          </div>
        </div>
      </div>
    );
  }

  const visibleStages = project.project_stages.filter(s =>
    selectedTeam && teamStages[selectedTeam]?.includes(s.stage_name)
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-500 ${project.status === 'code_red' ? 'bg-[#080000]' : 'bg-[#080808]'}`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b h-16 shrink-0 transition-all duration-500 ${
        project.status === 'code_red' ? 'bg-red-950/40 border-red-500/30' : 'bg-[#0c0c0e]/95 border-white/5'
      }`}>
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
           <button 
             onClick={() => setSelectedTeam(null)} 
             className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 transition-all active:scale-90 shrink-0"
           >
             <ChevronLeft className="h-5 w-5 text-gray-400" />
           </button>
           
           <div className="flex flex-col items-center min-w-0 flex-1 px-2">
             <h2 className="text-[14px] md:text-lg font-black text-white truncate leading-tight uppercase tracking-tight">{project.name}</h2>
             <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                  project.status === 'code_red' ? 'bg-red-500' : 'bg-indigo-500'
                }`}></div>
                <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] truncate ${
                  project.status === 'code_red' ? 'text-red-400' : 'text-indigo-300'
                }`}>{selectedTeam}</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setInfoModalOpen(true)}
                className="h-10 w-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl text-gray-400 active:scale-90 transition-all hover:text-white"
              >
                <Info className="h-4 w-4" />
              </button>
           </div>
        </div>
      </header>
 
      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pt-16 scrollbar-hide">
        <PipelineBar stages={project.project_stages} activeDepartmentStages={visibleStages} />

        {/* Admin Review Banner */}
        {isAdminReviewing && (
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start sm:items-center gap-4 animate-fade-in">
            <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">Project Pending Admin Review</h4>
              <p className="text-xs text-amber-400/80 mt-0.5">The pipeline is complete. Project is currently locked for evaluation.</p>
            </div>
          </div>
        )}

        {/* Completed Banner */}
        {isCompleted && (
          <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start sm:items-center gap-4 animate-fade-in">
            <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-300">Project Completed</h4>
              <p className="text-xs text-emerald-400/80 mt-0.5">This project has successfully passed all pipeline stages and admin review.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-12 mt-4 md:mt-12 pb-12 px-4 md:px-8">
          {/* Main Content: Task Boards */}
          <div className="xl:col-span-3">
             <div className="flex items-center justify-between mb-5 md:mb-10">
                <h3 className="text-lg md:text-2xl font-black text-white tracking-tight">Task Boards</h3>
                <div className="h-0.5 md:h-1 w-8 md:w-12 bg-indigo-500 rounded-full"></div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
               {visibleStages.map(stage => (
                 <StageCard
                   key={stage.id}
                   project={project}
                   stage={stage}
                   tools={selectedTeam ? teamTools[selectedTeam] : []}
                   onUpdate={() => fetchData(project.id)}
                   designation={user?.designation || selectedTeam || 'Innovation Team'}
                   onToast={(msg: string, type: 'success' | 'error' | 'info') => toast[type](msg)}
                 />
               ))}
             </div>
          </div>

          {/* Activity Side Section */}
          <div className="xl:col-span-1">
             <div className="flex items-center gap-4 mb-10">
                <Clock className="h-6 w-6 text-[#6366f1]" />
                <h3 className="text-2xl font-black text-white tracking-tight">Project Timeline</h3>
             </div>
             
             <div className="bg-[#0c0c0e] rounded-[32px] border border-white/5 p-8 shadow-2xl space-y-10 max-h-[700px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="relative pl-8 group pb-8 last:pb-0">
                    <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-indigo-500 bg-[#0c0c0e] z-10 group-hover:scale-125 transition-all"></div>
                    <div className="absolute left-[5.5px] top-6 w-[1.5px] h-full bg-white/5 last:hidden"></div>
                    
                    <div className="mb-2">
                       <span className="text-[11px] font-black uppercase tracking-widest text-[#818cf8]">{log.user_name}</span>
                       <p className="text-[9px] font-bold text-gray-700 mt-1 uppercase tracking-widest">
                         {new Date(log.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}, {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                       </p>
                    </div>
                    
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mb-3">{log.update_text}</p>
                    <span className="inline-block px-3 py-1 bg-[#1a1a2e] text-[#6366f1] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#6366f1]/20">
                      {log.stage.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-12 text-gray-700 font-bold text-xs uppercase tracking-widest">No activity history</div>
                )}
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

function TeamCard({ name, icon, description, isHighlighted, onClick, colorClass }: {
  name: string; icon: React.ReactNode; description: string; isHighlighted: boolean; onClick: () => void; colorClass: 'cyan' | 'indigo' | 'emerald';
}) {
  const colorMap = {
    cyan: { bgHighlight: 'bg-cyan-600', textHighlight: 'text-cyan-400', borderHighlight: 'border-cyan-500/30' },
    indigo: { bgHighlight: 'bg-indigo-600', textHighlight: 'text-indigo-400', borderHighlight: 'border-indigo-500/30' },
    emerald: { bgHighlight: 'bg-emerald-600', textHighlight: 'text-emerald-400', borderHighlight: 'border-emerald-500/30' }
  };
  const c = colorMap[colorClass];

  return (
    <div
      onClick={onClick}
      className={`p-6 md:p-10 rounded-[28px] md:rounded-[40px] cursor-pointer transition-all relative overflow-hidden group border-2 h-full flex flex-col active:scale-[0.98] ${
        isHighlighted ? `bg-[#0c0c0e] ${c.borderHighlight} shadow-2xl shadow-${colorClass}-500/10` : 'bg-[#0c0c0e] border-white/5 hover:border-white/20'
      }`}
    >
      <div className={`h-12 w-12 md:h-16 md:w-16 rounded-[18px] flex items-center justify-center mb-6 md:mb-10 transition-all ${
        isHighlighted ? `${c.bgHighlight} text-white shadow-lg` : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-white'
      }`}>
        {icon}
      </div>
      <h3 className="text-base md:text-xl font-black text-white mb-2 md:mb-4 leading-tight">{name}</h3>
      <p className="text-[11px] md:text-sm text-gray-500 font-semibold leading-relaxed mb-6 md:mb-10 flex-1">{description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] ${isHighlighted ? c.textHighlight : 'text-gray-600 group-hover:text-gray-400'}`}>Enter Workroom</span>
        <ChevronLeft className={`h-3 w-3 md:h-5 md:w-5 rotate-180 transition-all ${isHighlighted ? c.textHighlight : 'text-gray-600 group-hover:text-gray-400'}`} strokeWidth={3} />
      </div>
    </div>
  );
}
