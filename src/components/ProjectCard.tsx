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
  marketing: 'Marketing',
  admin_review: 'Admin Review',
  completed: 'All Complete',
  pending: 'Not Started',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-400',
  rejected: 'bg-red-500/15 text-red-400',
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
      className="bg-[#16161D] rounded-2xl border border-[#262633] p-6 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 cursor-pointer group relative overflow-hidden"
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${progressColor} rounded-t-2xl transition-all duration-700`} style={{ width: `${Math.max(progress, 8)}%`, right: 'auto' }} />

      <div className="flex justify-between items-start mb-2 mt-1">
        <h3 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400 leading-tight flex-1 mr-2 tracking-tight group-hover:via-indigo-300 group-hover:to-purple-400 transition-all duration-500">
          {project.name}
        </h3>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider shadow-sm ${STATUS_STYLES[project.status]}`}>
          {project.status.toUpperCase()}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2 pr-4">
          {project.description}
        </p>
      )}

      <div className="space-y-4">
        {/* Current stage */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
              <ChevronRight className="h-4 w-4 text-indigo-400" />
            </div>
            <span className="font-semibold text-gray-200">{currentStageLabel}</span>
          </div>
          {currentStageObj && (
            <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-500 text-white rounded-md uppercase tracking-tighter animate-pulse shadow-sm shadow-indigo-500/50">
              Live Work
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-gray-400 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Progress
            </span>
            <span className={`font-extrabold ${progress >= 80 ? 'text-emerald-400' : progress >= 50 ? 'text-indigo-400' : 'text-amber-400'}`}>
              {progress}%
            </span>
          </div>
          <div className="w-full bg-[#22222E] rounded-full h-2 overflow-hidden">
            <div
              className={`${progressColor} h-2 rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Mini Pipeline Indicator */}
          <div className="flex justify-between px-0.5">
            {['ideology', 'research', 'development', 'deployment', 'business', 'marketing'].map((sName) => {
              const s = stages.find(st => st.stage_name === sName);
              const isComp = s?.status === 'completed';
              const isAct = s?.status === 'in_progress';
              return (
                <div 
                  key={sName} 
                  title={STAGE_LABELS[sName]}
                  className={`h-1.5 flex-1 mx-0.5 rounded-full transition-all duration-500 ${
                    isComp ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                    isAct ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-[#2F2F3B]'
                  }`}
                />
              );
            })}
          </div>
          
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter flex justify-between items-center">
             <span>{completedStages} of {totalStages} cleared</span>
             {currentStageObj && <span className="text-indigo-400 animate-pulse">Active: {currentStageName}</span>}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#262633] flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {new Date(lastUpdatedTs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{project.team_members || 'Team'}</span>
          </div>
        </div>

        {/* Department Ratings - Only for Completed */}
        {project.status === 'completed' && project.admin_ratings?.[0] && (
          <div className="mt-4 pt-4 border-t border-indigo-500/10 grid grid-cols-3 gap-2 bg-[#12121A] rounded-xl p-3 border border-indigo-500/5">
            <div className="text-center group/rate">
              <p className="text-[8px] text-gray-500 uppercase font-black mb-1 tracking-tighter group-hover/rate:text-indigo-400 transition-colors">Innovation</p>
              <p className="text-sm font-black text-indigo-400">{project.admin_ratings[0].innovation_rating}<span className="text-[10px] text-gray-600">/10</span></p>
            </div>
            <div className="text-center group/rate">
              <p className="text-[8px] text-gray-500 uppercase font-black mb-1 tracking-tighter group-hover/rate:text-purple-400 transition-colors">Engineering</p>
              <p className="text-sm font-black text-purple-400">{project.admin_ratings[0].engineering_rating}<span className="text-[10px] text-gray-600">/10</span></p>
            </div>
            <div className="text-center group/rate">
              <p className="text-[8px] text-gray-500 uppercase font-black mb-1 tracking-tighter group-hover/rate:text-emerald-400 transition-colors">Business</p>
              <p className="text-sm font-black text-emerald-400">{project.admin_ratings[0].business_rating}<span className="text-[10px] text-gray-600">/10</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
