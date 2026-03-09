import type { ProjectStage, StageName } from '@/types';
import { CheckCircle, Circle, PlayCircle } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
}

export function PipelineBar({ stages }: PipelineBarProps) {
  const orderedStages: StageName[] = [
    'ideology', 'research', 'development', 'deployment', 'business', 'admin_review'
  ];

  const getStageIcon = (name: StageName) => {
    const stage = stages.find(s => s.stage_name === name);
    if (!stage) return <Circle className="h-5 w-5 text-gray-300" />;

    if (stage.status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (stage.status === 'in_progress') return <PlayCircle className="h-5 w-5 text-indigo-500 animate-pulse" />;
    return <Circle className="h-5 w-5 text-gray-300" />;
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {orderedStages.map((name, index) => (
          <div key={name} className="flex flex-1 items-center w-full md:w-auto">
            <div className="flex flex-col items-center flex-1">
              <div className="mb-2">{getStageIcon(name)}</div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                {name.replace('_', ' ')}
              </span>
            </div>
            {index < orderedStages.length - 1 && (
              <div className="hidden md:block h-[1px] bg-gray-100 flex-1 mx-2 mt-[-15px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
