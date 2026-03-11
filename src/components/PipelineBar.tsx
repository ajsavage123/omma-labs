import type { ProjectStage, StageName } from '@/types';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
  visibleStageNames?: StageName[];
}

const STAGE_LABELS: Record<string, string> = {
  ideology: 'Ideology',
  research: 'Research',
  development: 'Development',
  deployment: 'Deployment',
  business: 'Business',
  marketing: 'Marketing',
  admin_review: 'Admin Review',
};

const ORDERED_STAGES: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'];

export function PipelineBar({ stages, visibleStageNames }: PipelineBarProps) {
  const getStatus = (name: StageName) => stages.find(s => s.stage_name === name)?.status ?? 'pending';

  const stagesToShow = visibleStageNames ? ORDERED_STAGES.filter(s => visibleStageNames.includes(s)) : ORDERED_STAGES;

  const completedCount = stagesToShow.filter(s => getStatus(s) === 'completed').length;
  const progressPercent = Math.round((completedCount / stagesToShow.length) * 100);

  return (
    <div className="w-full bg-[#121216] border border-[#1F1F26] shadow-md rounded-2xl p-5 mb-8">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workflow Progress</p>
        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{progressPercent}% Complete</span>
      </div>

      {/* Stage bubbles - Scrollable on mobile */}
      <div className="overflow-x-auto pb-4 -mb-4 scrollbar-hide">
        <div className="relative flex items-center justify-between gap-0 min-w-[500px] sm:min-w-0 px-2">
          {stagesToShow.map((name, index) => {
            const status = getStatus(name);
            const isCompleted = status === 'completed';
            const isActive = status === 'in_progress';

            return (
              <div key={name} className="flex-1 flex flex-col items-center relative min-w-[80px]">
                {/* Connector line (left side) */}
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                      isCompleted || isActive ? 'bg-indigo-500' : 'bg-[#2F2F3B]'
                    }`}
                    style={{ left: '-50%' }}
                  />
                )}

                {/* Bubble */}
                <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/30'
                    : isActive
                      ? 'bg-[#1A1A24] border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-[#1A1A24] border-[#2A2A35]'
                }`}>
                  {isCompleted
                    ? <CheckCircle2 className="h-4 w-4 text-white" />
                    : isActive
                      ? <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                      : <Circle className="h-4 w-4 text-gray-600" />
                  }
                </div>

                {/* Label */}
                <span className={`mt-3 text-[10px] uppercase font-bold tracking-wider text-center leading-tight px-1 whitespace-nowrap sm:whitespace-normal ${
                  isCompleted ? 'text-indigo-400'
                  : isActive ? 'text-indigo-400'
                  : 'text-gray-500'
                }`}>
                  {STAGE_LABELS[name]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mt-5 w-full bg-[#1A1A24] rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-700 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
