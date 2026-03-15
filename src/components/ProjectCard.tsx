import type { Project, ProjectStage, StageName } from '@/types';
import { Calendar, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project & { project_stages: ProjectStage[] };
}

const stageLabels: Record<string, string> = {
  'ideology': 'Ideology & Concept',
  'research': 'Deep Research',
  'development': 'Development',
  'deployment': 'Deployment',
  'business': 'Business',
  'admin_review': 'Admin Review',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const stages = project.project_stages || [];
  const orderedStages: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'admin_review'];
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = 6;
  const progress = Math.round((completedStages / totalStages) * 100);

  const currentStage = stages.find(s => s.status === 'in_progress');
  const currentStageName = currentStage?.stage_name || (completedStages === totalStages ? 'completed' : 'pending');

  // Top border color
  const getBorderColor = () => {
    if (project.status === 'completed' || currentStageName === 'admin_review') return '#22c55e';
    if (currentStageName === 'deployment' || currentStageName === 'business') return '#6366f1';
    return '#6366f1';
  };

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="rounded-[22px] cursor-pointer group relative overflow-hidden transition-all hover:bg-[#181824]"
      style={{ backgroundColor: '#11111d', border: '1px solid #1c1c2b' }}
    >
      {/* Top accent line - fixed thickness */}
      <div 
        className="absolute top-0 left-0 w-full h-[2.5px]" 
        style={{ backgroundColor: getBorderColor() }}
      ></div>

      <div className="p-7">
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-xl font-bold text-white tracking-tight">{project.name}</h3>
          <span
            className="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(34,197,94,0.1)',
              color: '#4ade80',
              border: '1px solid rgba(34,197,94,0.15)'
            }}
          >
            {project.status.toUpperCase()}
          </span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-gray-500 mb-5 font-semibold">{project.description || 'testing'}</p>

        {/* Stage Highlight Block */}
        <div className="flex items-center justify-between mb-6 p-3 px-4 rounded-xl bg-[#161625] border border-white/5">
          <div className="flex items-center gap-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
              ['ideology', 'research'].includes(currentStageName) ? 'bg-[#f59e0b]/10' :
              ['development', 'deployment'].includes(currentStageName) ? 'bg-[#a855f7]/10' :
              ['business', 'marketing'].includes(currentStageName) ? 'bg-[#10b981]/10' : 'bg-[#1f1f2f]'
            }`}>
              <ChevronRight className={`h-4 w-4 ${
                ['ideology', 'research'].includes(currentStageName) ? 'text-[#f59e0b]' :
                ['development', 'deployment'].includes(currentStageName) ? 'text-[#a855f7]' :
                ['business', 'marketing'].includes(currentStageName) ? 'text-[#10b981]' : 'text-[#6366f1]'
              }`} />
            </div>
            <span className="text-white font-bold text-[14px]">{stageLabels[currentStageName] || 'Pending'}</span>
          </div>
          {currentStage && (
            <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded border ${
              ['ideology', 'research'].includes(currentStageName) ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' :
              ['development', 'deployment'].includes(currentStageName) ? 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20' :
              ['business', 'marketing'].includes(currentStageName) ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20' : 'bg-[#2a2a4a] text-[#818cf8] border-[#3a3a5a]'
            }`}>
              Live Work
            </span>
          )}
        </div>

        {/* Progress Text */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span className="text-base">⚙️</span> <span className="text-[#a855f7]">Progress</span>
          </div>
          <span className="text-white font-black text-xl">{progress}%</span>
        </div>

        {/* Segmented Progress Bar - Match screenshot width/gaps */}
        <div className="flex gap-[6px] mb-4">
          {orderedStages.map((name) => {
            const stg = stages.find(s => s.stage_name === name);
            const isCompleted = stg?.status === 'completed';
            const isActive = stg?.status === 'in_progress';
            
            let color = '#1e1e2d';
            if (isCompleted || isActive) {
               // Green for high stages/completed as per screenshot
               if (currentStageName === 'admin_review' || project.status === 'completed') color = '#22c55e';
               else color = '#6366f1';
            }

            return (
              <div
                key={name}
                className="flex-1 h-[6px] rounded-[1px] transition-all"
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>

        {/* Pipeline Info */}
        <div className="flex items-center justify-between mb-6 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-600">
          <span>{completedStages} OF {totalStages} CLEARED</span>
          <span className="text-[#6366f1]">ACTIVE: {currentStageName.toUpperCase().replace('_', ' ')}</span>
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-between items-center text-[10px] font-bold border-t border-white/5 text-gray-600">
          <div className="flex items-center gap-2">
            < Calendar className="h-3 w-3 text-[#f59e0b]" />
            Updated {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
          <div className="flex items-center gap-2 text-[#10b981]">
            <User className="h-3 w-3" />
            {project.team_members?.split(',')[0] || 'rakshith'}
          </div>
        </div>
      </div>
    </div>
  );
}
