import type { Project } from '@/types';
import { X, ExternalLink, Github, Users, Calendar, FileText, Tag } from 'lucide-react';

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
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121216] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-modal-in border border-[#1F1F26]"
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Project Details</p>
              <h2 className="text-2xl font-extrabold leading-tight">{project.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <span className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold ${statusStyles[project.status]}`}>
            {project.status.toUpperCase()}
          </span>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Description */}
          {project.description && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-gray-300 leading-relaxed">{project.description}</p>
              </div>
            </div>
          )}

          {/* Team Members */}
          {project.team_members && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Team Members</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.team_members.split(',').map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/15 text-purple-400 text-xs font-medium rounded-full">
                      {m.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Created Date */}
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#1F1F26] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Created On</p>
              <p className="text-sm text-gray-300">
                {new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Status Tag */}
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Tag className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Project ID</p>
              <p className="text-xs text-gray-400 font-mono">{project.id}</p>
            </div>
          </div>

          {/* Links */}
          <div className="pt-4 border-t border-[#1F1F26] space-y-3">
            {project.drive_link && (
              <a
                href={project.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-colors group border border-blue-500/20"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <ExternalLink className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Google Drive Folder</p>
                  <p className="text-xs text-blue-500/70 truncate">{project.drive_link}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-blue-500/50 flex-shrink-0" />
              </a>
            )}
            {project.github_link && (
              <a
                href={project.github_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Github className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">GitHub Repository</p>
                  <p className="text-xs text-gray-400 truncate">{project.github_link}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
