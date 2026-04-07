import type { ProjectStage, StageName } from '@/types';
import { Check } from 'lucide-react';

interface PipelineBarProps {
  stages: ProjectStage[];
  projectType?: 'internal' | 'client';
}

export function PipelineBar({ stages, projectType = 'client' }: PipelineBarProps) {
  const clientSequence: StageName[] = [
    'discovery', 'proposals_contracts', 'ui_ux_design', 'client_approval', 'development', 'qa_testing', 'client_uat', 'deployment', 'maintenance_support', 'admin_review'
  ];

  const internalSequence: StageName[] = [
    'ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'
  ];

  const activeSequence = projectType === 'client' ? clientSequence : internalSequence;

  // Dynamically extract and order only the sequences that exist for THIS specific project
  const orderedStages = [...stages]
    .filter(s => activeSequence.includes(s.stage_name))
    .sort((a, b) => activeSequence.indexOf(a.stage_name) - activeSequence.indexOf(b.stage_name))
    .map(s => s.stage_name);

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const activeLength = orderedStages.length > 0 ? orderedStages.length : 1;
  const progressPercent = Math.round((completedCount / activeLength) * 100);

  // Map system names to clean highly readable UI labels
  const BAR_LABEL_MAP: Record<string, string> = {
    ideology: 'Ideology',
    research: 'Research',
    development: 'Development',
    deployment: 'Deployment',
    business: 'Business',
    marketing: 'Marketing',
    admin_review: 'Review',
    discovery: 'Discovery',
    proposals_contracts: 'Contracts & Proposals',
    ui_ux_design: 'UI/UX Design',
    client_approval: 'Design Approval',
    qa_testing: 'QA & Testing',
    client_uat: 'Final Review', 
    maintenance_support: 'Maintenance & Retainer',
  };

  const MOBILE_LABEL_MAP: Record<string, string> = {
    discovery: 'Discovery',
    proposals_contracts: 'Contracts',
    ui_ux_design: 'UI/UX',
    client_approval: 'Approval',
    development: 'Development',
    qa_testing: 'QA Testing',
    client_uat: 'Review',
    deployment: 'Deployment',
    maintenance_support: 'Retainer',
    ideology: 'Ideology',
    research: 'Research',
    business: 'Business',
    marketing: 'Marketing',
    admin_review: 'Review',
  };

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block w-full bg-[#0c0c0e] p-8 rounded-[24px] border border-white/10 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
        
        <div className="flex justify-between items-center mb-10 px-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Workflow Progress</h3>
          <div className="px-3 py-1 rounded-full bg-[#11111d] border border-[#6366f1]/30 text-[#818cf8] text-[10px] font-black tracking-widest uppercase shadow-inner">
            {progressPercent}% <span className="hidden xl:inline">Complete</span>
          </div>
        </div>

        <div className="w-full pb-8">
          <div className="relative flex justify-between items-center px-8">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-[2px] bg-[#1a1a24]"></div>
            
            {orderedStages.map((name) => {
              const stage = stages.find(s => s.stage_name === name);
              const isCompleted = stage?.status === 'completed';
              const isInProgress = stage?.status === 'in_progress';
              
              return (
                <div key={name} className="relative z-10 flex flex-col items-center group">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' :
                    isInProgress ? 'bg-[#0c0c0e] border-2 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-pulse' :
                    'bg-[#0c0c0e] border-2 border-white/5 text-white/10'
                  }`}>
                    {isCompleted ? <Check className="h-4 w-4" strokeWidth={4} /> : 
                     isInProgress ? <div className="h-2 w-2 bg-current rounded-full" /> : null}
                  </div>
                  <span className={`absolute top-12 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                    isCompleted || isInProgress ? 'text-gray-200' : 'text-gray-400'
                  }`}>
                    {BAR_LABEL_MAP[name] || name.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#0c0c0e]">
           <div className="h-full bg-[#6366f1] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="md:hidden w-full bg-[#0c0c0e]/95 backdrop-blur-xl border-y border-white/5 py-6 mb-6 shadow-xl relative">
         <div className="px-4 flex items-center justify-between mb-8">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Master Pipeline</span>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase shadow-inner">
              {progressPercent}% Complete
            </div>
         </div>

         <div className="w-full overflow-x-auto hide-scroll px-4 pb-2">
            <div className="flex items-start gap-8 min-w-max">
              {orderedStages.map((name, idx) => {
                const stage = stages.find(s => s.stage_name === name);
                const isCompleted = stage?.status === 'completed';
                const isInProgress = stage?.status === 'in_progress';
                const isLast = idx === orderedStages.length - 1;
                
                return (
                  <div key={name} className="flex flex-col items-center relative w-[60px]">
                     <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all mb-3 z-10 ${
                       isCompleted ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' :
                       isInProgress ? 'border-2 border-indigo-500 bg-[#0c0c0e] text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse' :
                       'border-2 border-gray-600 bg-[#11111d] text-gray-500'
                     }`}>
                       {isCompleted ? <Check className="h-3 w-3" strokeWidth={4} /> : 
                        isInProgress ? <div className="h-1.5 w-1.5 bg-current rounded-full" /> : null}
                     </div>
                     
                     {/* Connector Line for Mobile */}
                     {!isLast && (
                       <div className="absolute top-3 left-[50%] w-full h-[2px] bg-gray-800 -z-0">
                         <div className={`h-full bg-indigo-500 transition-all duration-1000 ${isCompleted ? 'w-full' : 'w-0'}`}></div>
                       </div>
                     )}

                     <span className={`text-[8px] font-black uppercase tracking-tight leading-tight text-center break-words w-full ${
                       isCompleted || isInProgress ? 'text-white' : 'text-gray-500'
                     }`}>
                       {MOBILE_LABEL_MAP[name] || name.replace('_', ' ').substring(0, 10)}
                     </span>
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </>
  );
}
