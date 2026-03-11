import type { ProjectStage, StageName } from '@/types';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
}

const STAGE_LABELS: Record<StageName, string> = {
  ideology: 'Ideology',
  research: 'Research',
  development: 'Development',
  deployment: 'Deployment',
  business: 'Business',
  admin_review: 'Admin Review',
};

const ORDERED_STAGES: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'admin_review'];

export function PipelineBar({ stages }: PipelineBarProps) {
  const getStatus = (name: StageName) => stages.find(s => s.stage_name === name)?.status ?? 'pending';

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / ORDERED_STAGES.length) * 100);

  return (
    <div className="w-full bg-white border border-gray-100 shadow-sm rounded-2xl p-5 mb-8">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pipeline Progress</p>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{progressPercent}% Complete</span>
      </div>

      {/* Stage bubbles - Scrollable on mobile */}
      <div className="overflow-x-auto pb-4 -mb-4 scrollbar-hide">
        <div className="relative flex items-center justify-between gap-0 min-w-[500px] sm:min-w-0 px-2">
          {ORDERED_STAGES.map((name, index) => {
            const status = getStatus(name);
            const isCompleted = status === 'completed';
            const isActive = status === 'in_progress';

            return (
              <div key={name} className="flex-1 flex flex-col items-center relative min-w-[80px]">
                {/* Connector line (left side) */}
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 top-4 h-0.5 -translate-y-1/2 ${
                      isCompleted || isActive ? 'bg-indigo-400' : 'bg-gray-200'
                    }`}
                    style={{ left: '-50%' }}
                  />
                )}

                {/* Bubble */}
                <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600'
                    : isActive
                      ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-100'
                      : 'bg-white border-gray-200'
                }`}>
                  {isCompleted
                    ? <CheckCircle2 className="h-4 w-4 text-white" />
                    : isActive
                      ? <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                      : <Circle className="h-4 w-4 text-gray-300" />
                  }
                </div>

                {/* Label */}
                <span className={`mt-2 text-[9px] uppercase font-bold tracking-wider text-center leading-tight px-1 whitespace-nowrap sm:whitespace-normal ${
                  isCompleted ? 'text-indigo-600'
                  : isActive ? 'text-indigo-700'
                  : 'text-gray-400'
                }`}>
                  {STAGE_LABELS[name]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mt-5 w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-700 ease-in-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
