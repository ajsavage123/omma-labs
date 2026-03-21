import type { ProjectStage, StageName } from '@/types';
import { Check } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
  activeDepartmentStages?: ProjectStage[];
}

export function PipelineBar({ stages, activeDepartmentStages }: PipelineBarProps) {
  const orderedStages: StageName[] = [
    'ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'
  ];

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / orderedStages.length) * 100);

  // For mobile, we show the active department stages in a cleaner step layout
  const mobileStages = activeDepartmentStages || [];

  return (
    <>
      {/* --- DESKTOP VIEW (Full 7-stage pipeline) --- */}
      <div className="hidden md:block w-full bg-[#0c0c0e] p-8 rounded-[24px] border border-white/5 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent"></div>
        
        <div className="flex justify-between items-center mb-10 px-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Workflow Progress</h3>
          <div className="px-3 py-1 rounded-full bg-[#11111d] border border-[#6366f1]/30 text-[#818cf8] text-[10px] font-black tracking-widest uppercase">
            {progressPercent}% Complete
          </div>
        </div>

        <div className="relative flex justify-between items-center px-10">
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[2px] bg-[#1a1a24]"></div>
          
          {orderedStages.map((name) => {
            const stage = stages.find(s => s.stage_name === name);
            const isCompleted = stage?.status === 'completed';
            const isInProgress = stage?.status === 'in_progress';
            
            return (
              <div key={name} className="relative z-10 flex flex-col items-center group">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-[#6366f1] text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' :
                  isInProgress ? 'bg-[#0c0c0e] border-2 border-[#6366f1] text-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse' :
                  'bg-[#0c0c0e] border-2 border-[#1a1a24] text-[#1a1a24]'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={4} /> : 
                   isInProgress ? <div className="h-2 w-2 bg-current rounded-full" /> : null}
                </div>
                <span className={`absolute top-12 whitespace-nowrap text-[8px] font-black uppercase tracking-widest transition-colors duration-300 ${
                  isCompleted || isInProgress ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {name.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#0c0c0e]">
           <div className="h-full bg-[#6366f1] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* --- MOBILE VIEW (Compact & Visual) --- */}
      {mobileStages.length > 0 && (
        <div className="md:hidden w-full bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 py-4 mb-8 shadow-xl">
           <div className="px-5 flex items-center justify-between mb-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#6366f1]">Department Track</span>
              <div className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase">
                {progressPercent}% Total
              </div>
           </div>

           <div className="px-6 flex items-center gap-0">
             {mobileStages.map((stage, idx) => {
               const isCompleted = stage.status === 'completed';
               const isInProgress = stage.status === 'in_progress';
               
               return (
                 <div key={stage.id} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center relative">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        isCompleted ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]' :
                        isInProgress ? 'border-2 border-indigo-500 bg-[#0c0c0e] text-indigo-500' :
                        'border border-gray-800 bg-[#11111d] text-gray-800'
                      }`}>
                        {isCompleted ? <Check className="h-3 w-3" strokeWidth={4} /> : 
                         isInProgress ? <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse" /> : null}
                      </div>
                      <span className={`absolute top-8 whitespace-nowrap text-[8px] font-black uppercase tracking-tighter ${
                        isCompleted || isInProgress ? 'text-white' : 'text-gray-600'
                      }`}>
                        {stage.stage_name.replace('_', ' ')}
                      </span>
                    </div>
                    {idx < mobileStages.length - 1 && (
                      <div className="flex-1 h-[2px] mx-1 bg-gray-800">
                        <div className={`h-full bg-indigo-500 transition-all duration-500 ${isCompleted ? 'w-full' : 'w-0'}`}></div>
                      </div>
                    )}
                 </div>
               );
             })}
           </div>
        </div>
      )}
    </>
  );
}
