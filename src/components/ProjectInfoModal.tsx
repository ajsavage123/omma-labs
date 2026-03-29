import { useState } from 'react';
import type { Project, ProjectStage } from '@/types';
import { X, ExternalLink, Github, Users, Calendar, FileText, Tag, User, Phone, Copy, Check, Clock, ArrowRight } from 'lucide-react';

interface ProjectInfoModalProps {
  project: Project & { project_stages?: ProjectStage[] };
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: 'Active' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Completed' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Rejected' },
  code_red: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Code Red' },
  paused: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', label: 'Paused' },
};

export function ProjectInfoModal({ project, onClose }: ProjectInfoModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const stages = (project as any).project_stages || [];
  const completedCount = stages.filter((s: ProjectStage) => s.status === 'completed').length;
  const isInternal = project.project_type === 'internal';
  const totalStages = isInternal ? 5 : 9;
  const progress = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const daysElapsed = Math.floor((Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const deadlineDays = project.deadline 
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0f] md:rounded-[28px] rounded-t-[28px] shadow-2xl w-full max-w-lg max-h-[92vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-modal-in border border-white/10 md:m-4"
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header with gradient accent */}
        <div className="relative shrink-0 overflow-hidden">
          {/* Gradient bar */}
          <div className="absolute top-0 left-0 w-full h-[3px]" style={{
            background: isInternal 
              ? 'linear-gradient(90deg, #6366f1, #a78bfa, #6366f1)' 
              : 'linear-gradient(90deg, #10b981, #34d399, #10b981)'
          }}></div>
          
          {/* Background glow */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] pointer-events-none ${
            isInternal ? 'bg-indigo-500/20' : 'bg-emerald-500/20'
          }`}></div>

          <div className="p-5 md:p-7 pb-4 md:pb-5 relative z-10">
            {/* Top row: Track badge + Close */}
            <div className="flex items-center justify-between mb-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] border ${
                isInternal 
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {isInternal ? '◆ Internal Project' : '◆ Client Project'}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-gray-500 hover:text-white border border-white/5"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Title + Status */}
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight mb-3">{project.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}>
                {statusConf.label}
              </span>
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                Day {daysElapsed}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="px-5 md:px-7 py-3 bg-white/[0.02] border-y border-white/5 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pipeline Progress</span>
              <span className="text-[13px] md:text-[15px] font-black text-white">{progress}%</span>
            </div>
            <div className="w-full h-[5px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${progress}%`,
                  background: isInternal 
                    ? 'linear-gradient(90deg, #6366f1, #a78bfa)' 
                    : 'linear-gradient(90deg, #10b981, #34d399)'
                }}
              />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Stages</p>
            <p className="text-[13px] font-black text-white">{completedCount}<span className="text-gray-600">/{totalStages}</span></p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 md:p-7 space-y-5 overflow-y-auto flex-1 scrollbar-hide">
          
          {/* Description */}
          {project.description && (
            <div>
              <p className="flex items-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">
                <FileText className="h-3 w-3" /> Mission Brief
              </p>
              <p className="text-[13px] md:text-sm text-gray-300 leading-relaxed font-medium bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                {project.description}
              </p>
            </div>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Created */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Started</span>
              </div>
              <p className="text-[13px] text-white font-bold">
                {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Deadline */}
            <div className={`border rounded-2xl p-3.5 ${
              deadlineDays !== null && deadlineDays <= 7 
                ? 'bg-amber-500/5 border-amber-500/15' 
                : 'bg-white/[0.03] border-white/5'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-7 w-7 rounded-xl flex items-center justify-center ${
                  deadlineDays !== null && deadlineDays <= 7 ? 'bg-amber-500/15' : 'bg-white/5'
                }`}>
                  <Clock className={`h-3.5 w-3.5 ${deadlineDays !== null && deadlineDays <= 7 ? 'text-amber-400' : 'text-gray-500'}`} />
                </div>
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Deadline</span>
              </div>
              {project.deadline ? (
                <div>
                  <p className={`text-[13px] font-bold ${deadlineDays !== null && deadlineDays <= 7 ? 'text-amber-400' : 'text-white'}`}>
                    {new Date(project.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {deadlineDays !== null && (
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                      deadlineDays <= 0 ? 'text-red-400' : deadlineDays <= 7 ? 'text-amber-400' : 'text-gray-600'
                    }`}>
                      {deadlineDays <= 0 ? 'Overdue' : `${deadlineDays}d remaining`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-gray-600 font-bold">Not Set</p>
              )}
            </div>
          </div>

          {/* Client & Team */}
          <div className="grid grid-cols-1 gap-3">
            {(project.client_name || project.client_phone) && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.2em] mb-3">
                  <User className="h-3 w-3" /> Client Contact
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <span className="text-emerald-400 font-black text-[11px]">
                        {(project.client_name || 'C').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] text-white font-bold truncate">{project.client_name || 'Not specified'}</p>
                      {project.client_phone && (
                        <a href={`tel:${project.client_phone.replace(/[^\d+]/g, '')}`} className="text-[11px] text-emerald-400 font-bold hover:text-emerald-300 transition-colors flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {project.client_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  {project.client_phone && (
                    <button onClick={() => copyToClipboard(project.client_phone!, 'phone')} className="p-2 hover:bg-white/5 rounded-xl transition-colors shrink-0">
                      {copiedField === 'phone' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-gray-600" />}
                    </button>
                  )}
                </div>
              </div>
            )}

            {project.team_members && (
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">
                  <Users className="h-3 w-3" /> Core Team
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.team_members.split(',').map((m, i) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-xl border border-indigo-500/15">
                      {m.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Project ID */}
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
            <div className="h-7 w-7 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Tag className="h-3 w-3 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Project ID</p>
              <p className="text-[11px] text-gray-500 font-mono truncate">{project.id}</p>
            </div>
            <button onClick={() => copyToClipboard(project.id, 'id')} className="p-2 hover:bg-white/5 rounded-xl transition-colors shrink-0">
              {copiedField === 'id' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-gray-600" />}
            </button>
          </div>

          {/* External Links */}
          <div className="space-y-2.5">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Quick Access</p>
            
            {project.drive_link && (
              <a
                href={project.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3.5 bg-white/[0.03] rounded-2xl hover:bg-indigo-500/5 transition-all group border border-white/5 hover:border-indigo-500/20"
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                  <ExternalLink className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">Project Drive</p>
                  <p className="text-[10px] text-gray-600 truncate">{project.drive_link}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-700 group-hover:text-indigo-400 shrink-0 transition-colors" />
              </a>
            )}

            {project.github_link && (
              <a
                href={project.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3.5 bg-white/[0.03] rounded-2xl hover:bg-white/[0.05] transition-all group border border-white/5 hover:border-gray-500/30"
              >
                <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                  <Github className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">GitHub Repository</p>
                  <p className="text-[10px] text-gray-600 truncate">{project.github_link}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-700 group-hover:text-white shrink-0 transition-colors" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
