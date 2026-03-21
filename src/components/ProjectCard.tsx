import type { Project, ProjectStage, StageName } from '@/types';
import { useNavigate } from 'react-router-dom';

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
  ideology: '#f59e0b',
  research: '#f59e0b',
  development: '#a855f7',
  deployment: '#a855f7',
  business: '#10b981',
  marketing: '#10b981',
  admin_review: '#22c55e',
  completed: '#22c55e',
  pending: '#374151',
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
  const accentColor = stageColor[currentKey] || '#6366f1';

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="rounded-[18px] cursor-pointer relative overflow-hidden transition-all active:scale-[0.97] flex flex-col h-full"
      style={{ backgroundColor: '#11111d', border: '1px solid #1e1e2b' }}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})` }} />

      {/* === MOBILE CARD (shown on mobile/tablet, hidden md+) === */}
      <div className="md:hidden flex flex-col gap-4 p-5 flex-1">

        {/* Project Name */}
        <h3 className="text-[15px] font-black text-white leading-tight">{project.name}</h3>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider"
            style={{
              backgroundColor: project.status === 'active' ? 'rgba(99,102,241,0.12)' : project.status === 'completed' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: project.status === 'active' ? '#818cf8' : project.status === 'completed' ? '#4ade80' : '#f87171',
              border: `1px solid ${project.status === 'active' ? 'rgba(99,102,241,0.2)' : project.status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}
          >
            {project.status}
          </span>
        </div>

        {/* Current stage pill */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl self-start"
          style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
        >
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>
            {stageLabelShort[currentKey] || 'Pending'}
          </span>
        </div>

        {/* Segmented progress bar */}
        <div className="flex gap-[4px] mt-2">
          {orderedStages.map(name => {
            const s = stages.find(x => x.stage_name === name);
            return (
              <div
                key={name}
                className="flex-1 h-[5px] rounded-full"
                style={{ backgroundColor: s?.status === 'completed' || s?.status === 'in_progress' ? accentColor : '#1e1e2d' }}
              />
            );
          })}
        </div>

        {/* Progress % + cleared */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{completedCount}/{totalStages} Complete</span>
          <span className="text-[13px] font-black text-white">{progress}%</span>
        </div>
      </div>

      {/* === DESKTOP CARD (hidden on mobile) === */}
      <div className="hidden md:flex flex-col gap-0 p-7 flex-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white tracking-tight flex-1 mr-2">{project.name}</h3>
          <span
            className="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{
              backgroundColor: 'rgba(34,197,94,0.1)',
              color: project.status === 'completed' ? '#4ade80' : project.status === 'active' ? '#818cf8' : '#f87171',
              border: '1px solid rgba(34,197,94,0.15)'
            }}
          >
            {project.status.toUpperCase()}
          </span>
        </div>

        <p className="text-[12px] text-gray-500 mb-5 font-semibold line-clamp-2">{project.description || 'No description'}</p>

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
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progress</span>
          <span className="text-white font-black text-xl">{progress}%</span>
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

        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide text-gray-600 mb-6">
          <span>{completedCount} of {totalStages} cleared</span>
          <span style={{ color: accentColor }}>{currentKey.replace('_', ' ')}</span>
        </div>

        <div className="pt-4 flex justify-between items-center text-[10px] font-bold border-t border-white/5 text-gray-600 mt-auto">
          <span>Updated {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <span className="text-emerald-500">{project.team_members?.split(',')[0]?.trim() || 'Team'}</span>
        </div>
      </div>
    </div>
  );
}
