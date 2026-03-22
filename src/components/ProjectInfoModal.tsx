import { useState } from 'react';
import type { Project } from '@/types';
import { X, ExternalLink, Github, Users, Calendar, FileText, Tag, User, Phone, Copy, Check } from 'lucide-react';

interface ProjectInfoModalProps {
  project: Project;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-400',
  rejected: 'bg-red-500/15 text-red-400',
};

export function ProjectInfoModal({ project, onClose }: ProjectInfoModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0c0e]/95 backdrop-blur-xl rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-modal-in border border-white/10 m-4"
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#11111d] border-b border-white/5 p-6 md:p-8 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          <div className="flex justify-between items-start z-10 relative">
            <div className="flex-1 pr-4">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Project Profile</p>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">{project.name}</h2>
              <span className={`mt-4 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyles[project.status]}`}>
                {project.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-gray-400 border border-white/5 flex-shrink-0"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1 scroll-smooth">
          {/* Description */}
          {project.description && (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">
                 <FileText className="h-3.5 w-3.5" /> Description
              </p>
              <div className="bg-white/5 border border-white/5 rounded-[20px] p-5">
                <p className="text-sm text-gray-300 leading-relaxed font-medium">{project.description}</p>
              </div>
            </div>
          )}

            {/* Client & Team */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(project.client_name || project.client_phone) && (
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">
                    <User className="h-3.5 w-3.5" /> Client Informaton
                  </p>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white font-bold truncate">{project.client_name || 'Anonymous Client'}</p>
                      {project.client_name && (
                        <button onClick={() => copyToClipboard(project.client_name!, 'name')} className="p-1 hover:bg-white/5 rounded transition-colors">
                           {copiedField === 'name' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 text-gray-600" />}
                        </button>
                      )}
                    </div>
                    {project.client_phone && (
                      <div className="flex items-center justify-between">
                        <a href={`tel:${project.client_phone.replace(/[^\d+]/g, '')}`} className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors flex items-center gap-1.5 overflow-hidden">
                          <Phone className="h-3 w-3 shrink-0" /> <span className="truncate">{project.client_phone}</span>
                        </a>
                        <button onClick={() => copyToClipboard(project.client_phone!, 'phone')} className="p-1 hover:bg-white/5 rounded transition-colors">
                           {copiedField === 'phone' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 text-gray-600" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {project.team_members && (
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">
                     <Users className="h-3.5 w-3.5" /> Team Members
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.team_members.split(',').map((m, i) => (
                      <span key={i} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wide rounded-full border border-indigo-500/20">
                        {m.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Created Date & ID */}
            <div className="space-y-6">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">
                   <Calendar className="h-3.5 w-3.5" /> Created On
                </p>
                <p className="text-sm text-gray-300 font-medium">
                  {new Date(project.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">
                   <Tag className="h-3.5 w-3.5" /> Project ID
                </p>
                <p className="text-xs text-gray-500 font-mono bg-white/5 px-2 py-1 rounded-md inline-block border border-white/10">
                  {project.id.split('-')[0]}...
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="pt-6 border-t border-white/5 space-y-3">
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">External Links</p>
            {project.drive_link && (
              <a
                href={project.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-[#11111d] rounded-[20px] hover:bg-white/5 transition-colors group border border-white/5 hover:border-indigo-500/30"
              >
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                  <ExternalLink className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">Drive Folder</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{project.drive_link}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
              </a>
            )}
            {project.github_link && (
              <a
                href={project.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-[#11111d] rounded-[20px] hover:bg-white/5 transition-colors group border border-white/5 hover:border-gray-500/50"
              >
                <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                  <Github className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">GitHub Repository</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{project.github_link}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-white flex-shrink-0 transition-colors" />
              </a>
            )}
          </div>
      </div>
    </div>
  );
}
