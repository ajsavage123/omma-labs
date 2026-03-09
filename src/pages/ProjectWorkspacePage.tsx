import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '@/services/projectService';
import type { Project, ProjectStage, TimelineLog, Designation } from '@/types';
import { PipelineBar } from '@/components/PipelineBar';
import { StageCard } from '@/components/StageCard';
import { ChevronLeft, Info, Briefcase, Code, Microscope, Clock } from 'lucide-react';

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

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Workspace...</div>;
  if (!project) return <div>Project not found</div>;

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
    'Business Strategy & Marketing Team': ['business']
  };

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back to Dashboard
          </button>

          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Select Your Team</h2>
            <p className="text-gray-500 text-lg">Choose your department workroom for {project.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TeamCard
              name="Innovation & Research Team"
              icon={<Microscope className="h-8 w-8 text-blue-500" />}
              description="Focus on project ideology and market research."
              onClick={() => setSelectedTeam('Innovation & Research Team')}
            />
            <TeamCard
              name="Developer & Engineering Team"
              icon={<Code className="h-8 w-8 text-indigo-500" />}
              description="Build, test and deploy the innovation."
              onClick={() => setSelectedTeam('Developer & Engineering Team')}
            />
            <TeamCard
              name="Business Strategy & Marketing Team"
              icon={<Briefcase className="h-8 w-8 text-emerald-500" />}
              description="Plan marketing and scale the business."
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSelectedTeam(null)}
                className="mr-4 p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-xs text-indigo-600 font-medium">{selectedTeam}</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right mr-4">
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium text-gray-900">Innovation Team</p>
              </div>
              <div className="h-8 w-[1px] bg-gray-200" />
              <button className="p-2 text-gray-400 hover:text-indigo-600">
                <Info className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PipelineBar stages={project.project_stages} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Focused Workroom */}
          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleStages.map(stage => (
                <StageCard
                  key={stage.id}
                  projectId={project.id}
                  stage={stage}
                  tools={teamTools[selectedTeam]}
                  driveLink={project.drive_link}
                  onUpdate={() => fetchData(project.id)}
                  designation={user?.designation || selectedTeam}
                />
              ))}
            </div>

            {selectedTeam === 'Business Strategy & Marketing Team' && visibleStages.length > 0 && (
               <div className="bg-indigo-900 rounded-xl p-8 text-white shadow-xl">
                  <h3 className="text-xl font-bold mb-4">Business Execution Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                      <h4 className="font-bold mb-2 text-indigo-200">Business Strategy</h4>
                      <p className="text-sm opacity-80">Define revenue models and growth targets.</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                      <h4 className="font-bold mb-2 text-indigo-200">Marketing Planning</h4>
                      <p className="text-sm opacity-80">Outline campaign phases and channel selection.</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                      <h4 className="font-bold mb-2 text-indigo-200">Customer Feedback</h4>
                      <p className="text-sm opacity-80">Collect and analyze initial user responses.</p>
                    </div>
                  </div>
               </div>
            )}
          </div>

          {/* Activity Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <Clock className="mr-2 h-4 w-4 text-indigo-500" />
                Project Timeline
              </h3>
              <div className="space-y-6">
                {logs.map(log => (
                  <div key={log.id} className="relative pl-6 pb-6 border-l border-gray-100 last:pb-0">
                    <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase">{log.user_name}</span>
                      <span className="text-[9px] text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{log.update_text}</p>
                    <span className="text-[9px] mt-2 inline-block px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase font-medium">
                      {log.stage.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TeamCard({ name, icon, description, onClick }: { name: string, icon: React.ReactNode, description: string, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer group text-center"
    >
      <div className="bg-gray-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-50 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{name}</h3>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      <div className="inline-flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
        Enter Workroom <ChevronLeft className="ml-1 h-4 w-4 rotate-180" />
      </div>
    </div>
  );
}
