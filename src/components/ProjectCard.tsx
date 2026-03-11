import type { Project, ProjectStage } from '@/types';
import { Calendar, ChevronRight, Users, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project & { project_stages: ProjectStage[] };
}

const STAGE_LABELS: Record<string, string> = {
  ideology: 'Ideology & Concept',
  research: 'Research',
  development: 'Development',
  deployment: 'Deployment',
  business: 'Business Strategy',
  admin_review: 'Admin Review',
  completed: 'All Complete',
  pending: 'Not Started',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const stages = project.project_stages || [];
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = 6;
  const progress = Math.round((completedStages / totalStages) * 100);

  const currentStageObj = stages.find(s => s.status === 'in_progress');
  const currentStageName = currentStageObj?.stage_name
    ?? (completedStages === totalStages ? 'completed' : 'pending');
  const currentStageLabel = STAGE_LABELS[currentStageName] ?? currentStageName;

  // Use most recent stage timestamp as "last updated"
  const allTimestamps = stages
    .flatMap(s => [s.started_at, s.completed_at])
    .filter(Boolean) as string[];
  const lastUpdatedTs = allTimestamps.length > 0
    ? allTimestamps.sort().reverse()[0]
    : project.created_at;

  const progressColor =
    progress >= 80 ? 'bg-emerald-500'
    : progress >= 50 ? 'bg-indigo-500'
    : progress >= 25 ? 'bg-amber-500'
    : 'bg-gray-300';

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer group relative overflow-hidden"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${progressColor} rounded-t-2xl transition-all duration-700`} style={{ width: `${Math.max(progress, 8)}%`, right: 'auto' }} />

      <div className="flex justify-between items-start mb-4 mt-1">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight flex-1 mr-2">
          {project.name}
        </h3>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${STATUS_STYLES[project.status]}`}>
          {project.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Current stage */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <span className="font-medium text-gray-500">Stage:</span>
          <span className="font-semibold text-gray-800">{currentStageLabel}</span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-500 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Progress
            </span>
            <span className={`font-extrabold ${progress >= 80 ? 'text-emerald-600' : progress >= 50 ? 'text-indigo-600' : 'text-amber-600'}`}>
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`${progressColor} h-2 rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-medium">{completedStages} of {totalStages} stages complete</p>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {new Date(lastUpdatedTs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{project.team_members || 'Team'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
