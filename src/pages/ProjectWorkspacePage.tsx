import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog, Designation } from '@/types';
import { PipelineBar } from '@/components/PipelineBar';
import { StageCard } from '@/components/StageCard';
import { ChevronLeft, Info, Briefcase, Code, Lightbulb, Clock, ExternalLink, Sparkles } from 'lucide-react';

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<(Project & { project_stages: ProjectStage[] }) | null>(null);
  const [logs, setLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Designation | null>(null);

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
    } catch (error) {
      console.error('Error fetching project:', error);
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
      { name: 'Perplexity AI', url: 'https://perplexity.ai' },
      { name: 'ChatGPT', url: 'https://chat.openai.com' },
      { name: 'Claude AI', url: 'https://claude.ai' },
      { name: 'Miro', url: 'https://miro.com' },
      { name: 'Google Docs', url: 'https://docs.google.com' },
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
    ]
  };

  const teamStages: Record<Designation, string[]> = {
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

  if (!selectedTeam) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#080808] flex items-center justify-center p-6">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#6366f1]/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#8b5cf6]/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-5xl w-full">
           <button onClick={() => navigate('/')} className="flex items-center text-xs font-bold uppercase tracking-widest text-gray-600 mb-12 hover:text-[#6366f1] transition-colors">
             <ChevronLeft className="mr-2 h-4 w-4" />
             Back to Dashboard
           </button>

           <div className="text-center mb-16">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#11111d] border border-[#6366f1]/30 text-[#818cf8] text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                {project.name}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-4">
                <Sparkles className="h-8 w-8 text-[#f59e0b] animate-pulse" />
                Select Workroom
              </h1>
              <p className="text-gray-500 font-bold text-sm md:text-base px-10">Choose your department to access the specialized task boards</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <TeamCard
                name="Innovation & Research Team"
                icon={<Lightbulb className="h-8 w-8 text-[#f59e0b]" />}
                description="Idea validation & conceptual research."
                color="#f59e0b"
                isHighlighted={highlightedTeam === 'Innovation & Research Team'}
                onClick={() => setSelectedTeam('Innovation & Research Team')}
              />
              <TeamCard
                name="Developer & Engineering Team"
                icon={<Code className="h-8 w-8 text-[#a855f7]" />}
                description="Technical architecture & development."
                color="#a855f7"
                isHighlighted={highlightedTeam === 'Developer & Engineering Team'}
                onClick={() => setSelectedTeam('Developer & Engineering Team')}
              />
              <TeamCard
                name="Business Strategy & Marketing Team"
                icon={<Briefcase className="h-8 w-8 text-[#10b981]" />}
                description="Business scaling & marketing growth."
                color="#10b981"
                isHighlighted={highlightedTeam === 'Business Strategy & Marketing Team'}
                onClick={() => setSelectedTeam('Business Strategy & Marketing Team')}
              />
           </div>
        </div>
      </div>
    );
  }

  const visibleStages = project.project_stages.filter(s =>
    teamStages[selectedTeam].includes(s.stage_name)
  );

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      {/* Refined Workspace Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4 overflow-hidden">
              <button 
                onClick={() => setSelectedTeam(null)} 
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 shrink-0"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-white truncate leading-tight capitalize">{project.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6366f1] truncate">{selectedTeam}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <button 
                onClick={() => window.open(project.drive_link, "_blank")}
                className="hidden sm:flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white text-[11px] font-black uppercase tracking-widest rounded-full shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:scale-[1.05] transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                Open Project Drive
              </button>
              <button className="h-10 px-4 rounded-xl bg-[#11111d] border border-white/5 flex items-center gap-3 text-gray-500 hover:text-white transition-all">
                <Info className="h-4 w-4" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Project Info</span>
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        {/* Mobile Header Buttons (Mobile Only) */}
        <div className="flex sm:hidden gap-3 mb-8">
           <button 
             onClick={() => window.open(project.drive_link, "_blank")}
             className="flex-1 py-3 bg-[#6366f1] text-white text-[9px] font-black uppercase tracking-widest rounded-xl text-center"
           >
             Open Drive
           </button>
           <button className="flex-1 py-3 bg-[#11111d] border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-xl text-center">
             Project Info
           </button>
        </div>

        <PipelineBar stages={project.project_stages} />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 mt-12">
          {/* Main Content: Task Boards */}
          <div className="xl:col-span-3">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-white tracking-tight">Task Boards</h3>
                <div className="h-1 w-12 bg-indigo-500 rounded-full"></div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {visibleStages.map(stage => (
                 <StageCard
                   key={stage.id}
                   project={project}
                   stage={stage}
                   tools={teamTools[selectedTeam]}
                   onUpdate={() => fetchData(project.id)}
                   designation={user?.designation || selectedTeam}
                 />
               ))}
             </div>
          </div>

          {/* Activity Side Section: Project Timeline */}
          <div className="xl:col-span-1">
             <div className="flex items-center gap-4 mb-10">
                <Clock className="h-6 w-6 text-[#6366f1]" />
                <h3 className="text-2xl font-black text-white tracking-tight">Project Timeline</h3>
             </div>
             
             <div className="bg-[#0c0c0e] rounded-[32px] border border-white/5 p-8 shadow-2xl space-y-10">
                {logs.slice(0, 10).map((log, idx) => (
                  <div key={log.id} className="relative pl-8 group">
                    <div className={`absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 bg-[#0c0c0e] z-10 ${
                      idx % 3 === 0 ? 'border-[#f59e0b]' : idx % 3 === 1 ? 'border-[#a855f7]' : 'border-[#10b981]'
                    }`}></div>
                    <div className="absolute left-[5.5px] top-6 w-[1.5px] h-[calc(100%+40px)] bg-white/5 last:hidden"></div>
                    
                    <div className="mb-2">
                       <span className="text-[11px] font-black uppercase tracking-widest text-[#818cf8]">{log.user_name}</span>
                       <p className="text-[10px] font-bold text-gray-700 mt-1 uppercase tracking-widest">
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
    </div>
  );
}

function TeamCard({ name, icon, description, color, isHighlighted, onClick }: {
  name: string; icon: React.ReactNode; description: string; color: string; isHighlighted: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-10 rounded-[40px] cursor-pointer transition-all relative overflow-hidden group border-2 ${
        isHighlighted ? 'bg-[#11111d] border-[#6366f1]/20 shadow-[0_20px_80px_rgba(99,102,241,0.1)]' : 'bg-[#11111d] border-white/5 hover:border-[#6366f1]/10'
      }`}
    >
      <div className={`h-16 w-16 rounded-[20px] flex items-center justify-center mb-10 transition-all ${
        isHighlighted ? 'bg-[#6366f1] text-white shadow-[0_10px_30px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-gray-600 group-hover:bg-white/10'
      }`}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-white mb-4 leading-tight">{name}</h3>
      <p className="text-sm text-gray-500 font-semibold leading-relaxed mb-10">{description}</p>
      
      <div className={`flex items-center justify-between transition-all ${isHighlighted ? 'text-[#818cf8]' : 'text-gray-800'}`}>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Enter Workroom</span>
        <ChevronLeft className="h-5 w-5 rotate-180" strokeWidth={3} />
      </div>
      
      {isHighlighted && (
        <div className="absolute top-0 right-0 h-2" style={{ width: '40%', backgroundColor: color }}></div>
      )}
    </div>
  );
}
