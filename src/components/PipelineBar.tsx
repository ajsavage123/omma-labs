import type { ProjectStage, StageName } from '@/types';
import { Check, Circle } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
}

export function PipelineBar({ stages }: PipelineBarProps) {
  const orderedStages: StageName[] = [
    'ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'
  ];

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / orderedStages.length) * 100);

  return (
    <div className="w-full bg-[#0c0c0e] p-6 md:p-8 rounded-[24px] border border-white/5 mb-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent"></div>
      
      <div className="flex justify-between items-center mb-10 px-2 md:px-4">
        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Workflow Progress</h3>
        <div className="px-3 py-1 rounded-full bg-[#11111d] border border-[#6366f1]/30 text-[#818cf8] text-[9px] md:text-[10px] font-black tracking-widest uppercase">
          {progressPercent}% Complete
        </div>
      </div>

      <div className="relative overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
        <div className="min-w-[600px] md:min-w-0 relative flex justify-between items-center px-6 md:px-10">
          {/* Background Line */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[2px] bg-[#1a1a24]"></div>
          
          {orderedStages.map((name) => {
            const stage = stages.find(s => s.stage_name === name);
            const isCompleted = stage?.status === 'completed';
            const isInProgress = stage?.status === 'in_progress';
            
            return (
              <div key={name} className="relative z-10 flex flex-col items-center group">
                <div className={`h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-[#6366f1] text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' :
                  isInProgress ? 'bg-[#0c0c0e] border-2 border-[#6366f1] text-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse' :
                  'bg-[#0c0c0e] border-2 border-[#1a1a24] text-[#1a1a24]'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={4} /> : 
                   isInProgress ? <Circle className="h-2 w-2 fill-current" /> : null}
                </div>
                
                <span className={`absolute top-10 md:top-12 whitespace-nowrap text-[8px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  isCompleted || isInProgress ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {name.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bottom Border Accent */}
      <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#0c0c0e]">
         <div className="h-full bg-[#6366f1] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
      </div>
    </div>
  );
}
