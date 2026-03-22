import type { Project, ProjectStage, StageName } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Users } from 'lucide-react';

interface ProjectCardProps {
  project: Project & { project_stages: ProjectStage[] };
}

const stageLabelShort: Record<string, string> = {
  ideology: 'Concept',
  research: 'Research',
  development: 'Dev',
  deployment: 'Deploy',
  business: 'Business',
  marketing: 'Marketing',
  admin_review: 'Review',
};

const stageColor: Record<string, string> = {
  ideology: '#6366f1', // Unified Indigo
  research: '#818cf8', // Soft Indigo
  development: '#6366f1',
  deployment: '#6366f1',
  business: '#6366f1',
  marketing: '#6366f1',
  admin_review: '#a78bfa', // Violet accent
  completed: '#10b981', // Success remains green
  pending: '#4b5563',
};

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const stages = project.project_stages || [];
  const orderedStages: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'admin_review'];
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalStages = 6;
  const progress = Math.round((completedCount / totalStages) * 100);

  const currentStage = stages.find(s => s.status === 'in_progress');
  const currentKey = currentStage?.stage_name || (completedCount === totalStages ? 'completed' : 'pending');
  const accentColor = stageColor[currentKey] || '#10b981';

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="rounded-[18px] cursor-pointer relative overflow-hidden transition-all active:scale-[0.97] flex flex-col h-full"
      style={{ backgroundColor: '#11111d', border: '1px solid #1e1e2b' }}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})` }} />

      <div className="flex flex-col gap-0 p-5 md:p-7 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight flex-1 mr-2">{project.name}</h3>
          <span
            className="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 md:mt-0"
            style={{
              backgroundColor: 'rgba(34,197,94,0.1)',
              color: project.status === 'completed' ? '#4ade80' : project.status === 'active' ? '#818cf8' : '#f87171',
              border: '1px solid rgba(34,197,94,0.15)'
            }}
          >
            {project.status.toUpperCase()}
          </span>
        </div>

        <p className="text-[11px] md:text-[12px] text-gray-500 mb-5 font-semibold line-clamp-2">{project.description || 'No description'}</p>

        {/* Client & Team Desktop UI */}
        <div className="grid grid-cols-2 gap-3 mb-5">
           <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <User className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] uppercase tracking-widest text-gray-500 font-bold">Client</span>
                <span className="text-[10px] text-white font-bold truncate">{project.client_name || 'N/A'}</span>
              </div>
           </div>
           <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5">
              <Users className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] uppercase tracking-widest text-gray-500 font-bold">Core Team</span>
                <span className="text-[10px] text-white font-bold truncate">{project.team_members || 'Assigned'}</span>
              </div>
           </div>
        </div>

        {/* Stage block */}
        <div
          className="flex items-center justify-between mb-6 p-3 px-4 rounded-xl"
          style={{ backgroundColor: '#161625', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
            <span className="text-white font-bold text-[13px]">{stageLabelShort[currentKey] || 'Pending'}</span>
          </div>
          {currentStage && (
            <span
              className="px-2 py-0.5 text-[8px] font-bold uppercase rounded border"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor, borderColor: `${accentColor}30` }}
            >
              Active
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progress</span>
          <span className="text-white font-black text-lg md:text-xl">{progress}%</span>
        </div>

        <div className="flex gap-[5px] mb-4">
          {orderedStages.map(name => {
            const s = stages.find(x => x.stage_name === name);
            return (
              <div key={name} className="flex-1 h-[5px] rounded-full"
                style={{ backgroundColor: s?.status === 'completed' || s?.status === 'in_progress' ? accentColor : '#1e1e2d' }} />
            );
          })}
        </div>

        <div className="flex justify-between text-[8px] md:text-[9px] font-bold uppercase tracking-wide text-gray-600 mb-6">
          <span>{completedCount} of {totalStages} cleared</span>
          <span style={{ color: accentColor }}>{currentKey.replace('_', ' ')}</span>
        </div>

        <div className="pt-4 flex justify-between items-start md:items-center flex-col md:flex-row gap-1.5 md:gap-0 text-[10px] font-bold border-t border-white/5 text-gray-600 mt-auto">
          <span>Started {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          {project.deadline && (
            <span className="flex items-center gap-1.5 text-amber-500/80">
              <Clock className="h-3 w-3" />
              Deadline: {new Date(project.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
