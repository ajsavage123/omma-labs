import { useState } from 'react';
import type { Project, ProjectStage, StageName } from '@/types';
import { ExternalLink, Plus, Send, Github, TrendingUp, BarChart2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface StageCardProps {
  project: Project;
  stage: ProjectStage;
  tools: { name: string; url: string }[];
  onUpdate: () => void;
  designation: string;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const STAGE_LABEL_MAP: Record<string, string> = {
  ideology: 'Ideology & Concept',
  research: 'Research',
  development: 'Development',
  deployment: 'Deployment',
  business: 'Business Strategy & Marketing',
  admin_review: 'Admin Review',
};

const NEXT_TEAM_LABEL: Record<string, string> = {
  ideology: 'Research →',
  research: 'Engineering Team →',
  development: 'Deployment →',
  deployment: 'Business Team →',
  business: 'Admin Review →',
  admin_review: 'Finish',
};

const businessSubPanels = [
  {
    icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
    title: 'Business Strategy',
    description: 'Define revenue models, pricing strategy, and growth metrics.',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: <BarChart2 className="h-4 w-4 text-indigo-500" />,
    title: 'Marketing Planning',
    description: 'Plan ad campaigns, social media, and customer acquisition channels.',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    icon: <MessageCircle className="h-4 w-4 text-purple-500" />,
    title: 'Customer Feedback',
    description: 'Collect early user responses, NPS scores, and iterate on feedback.',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
];

export function StageCard({ project, stage, tools, onUpdate, designation, onToast }: StageCardProps) {
  const [updateText, setUpdateText] = useState('');
  const [githubUrl, setGithubUrl] = useState(project.github_link || '');
  const [loading, setLoading] = useState(false);

  const stageName = STAGE_LABEL_MAP[stage.stage_name] ?? stage.stage_name;
  const isActive = stage.status === 'in_progress';
  const isCompleted = stage.status === 'completed';

  const handleLogActivity = async () => {
    if (!updateText.trim()) return;
    setLoading(true);
    try {
      await projectService.logActivity(project.id, designation, stage.stage_name, updateText);
      setUpdateText('');
      onUpdate();
      onToast?.('Update logged successfully!', 'success');
    } catch {
      onToast?.('Failed to log update. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGithub = async () => {
    if (!githubUrl.trim()) return;
    setLoading(true);
    try {
      await projectService.updateGithubLink(project.id, githubUrl);
      await projectService.logActivity(project.id, designation, stage.stage_name, `GitHub repository linked: ${githubUrl}`);
      onUpdate();
      onToast?.('GitHub link updated!', 'success');
    } catch {
      onToast?.('Failed to update GitHub link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStage = async () => {
    const order: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'admin_review'];
    const currentIndex = order.indexOf(stage.stage_name);
    const nextStage = currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

    setLoading(true);
    try {
      await projectService.updateStageStatus(project.id, stage.stage_name, nextStage, 'User', designation);
      await onUpdate();
      const nextLabel = nextStage ? STAGE_LABEL_MAP[nextStage] : 'completion';
      onToast?.(`Stage submitted! Moving to ${nextLabel}.`, 'success');
    } catch {
      onToast?.('Failed to advance stage. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNotes = () => window.open(project.drive_link, '_blank');

  return (
    <div className={`bg-white rounded-2xl border flex flex-col h-full transition-all duration-200 ${
      isCompleted
        ? 'border-emerald-200 bg-emerald-50/30'
        : isActive
          ? 'border-indigo-200 shadow-lg shadow-indigo-50 ring-1 ring-indigo-100'
          : 'border-gray-100 opacity-70'
    }`}>
      {/* Card Header */}
      <div className="flex justify-between items-start p-5 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">{stageName}</h3>
          <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isCompleted ? 'bg-emerald-100 text-emerald-700'
            : isActive ? 'bg-indigo-100 text-indigo-700'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {isCompleted ? '✓ COMPLETED' : isActive ? '● IN PROGRESS' : '○ PENDING'}
          </span>
        </div>
        <button
          onClick={openNotes}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Notes
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1 flex flex-col">
        {/* Business strategy sub-panels (only for business stage) */}
        {stage.stage_name === 'business' && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workstreams</p>
            {businessSubPanels.map(p => (
              <div key={p.title} className={`flex gap-3 p-3 ${p.bg} border ${p.border} rounded-xl`}>
                <div className="mt-0.5">{p.icon}</div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{p.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tools */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Recommended Tools</p>
          <div className="flex flex-wrap gap-1.5">
            {tools.map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-gray-50 text-xs font-medium text-gray-700 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
              >
                {tool.name}
              </a>
            ))}
          </div>
        </div>

        {/* GitHub link (dev stage only) */}
        {stage.stage_name === 'development' && designation === 'Developer & Engineering Team' && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">GitHub Repository</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={githubUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/your-org/repo"
                className="flex-1 text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button
                onClick={handleUpdateGithub}
                disabled={loading || !githubUrl.trim()}
                title="Save GitHub link"
                className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                <Github className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Add Update (only when active) */}
        {isActive && (
          <div className="flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Add Update</p>
            <div className="relative">
              <textarea
                value={updateText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUpdateText(e.target.value)}
                placeholder="What did you complete or discover?"
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && e.ctrlKey) handleLogActivity(); }}
                className="w-full text-sm p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-20"
              />
                <button
                onClick={handleLogActivity}
                disabled={loading || !updateText.trim()}
                title="Log update (Ctrl+Enter)"
                className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-bold text-emerald-700">Stage completed</p>
          </div>
        )}
      </div>

      {/* Submit Stage */}
      {isActive && (
        <div className="p-5 pt-0">
          <button
            onClick={handleNextStage}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md shadow-indigo-200 disabled:opacity-40 text-sm"
          >
            <Send className="h-4 w-4" />
            Submit Stage &nbsp;{NEXT_TEAM_LABEL[stage.stage_name] ?? '→'}
          </button>
        </div>
      )}
    </div>
  );
}
