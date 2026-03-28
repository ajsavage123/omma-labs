import { useState } from 'react';
import type { Project, ProjectStage, StageName } from '@/types';
import { ExternalLink, Plus, Send, FileText, Search, Github, TrendingUp, BarChart2, MessageCircle, CheckCircle2, Globe, Layers, Wind, PenTool, Layout } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface StageCardProps {
  project: Project;
  stage: ProjectStage;
  tools: { name: string, url: string }[];
  onUpdate: () => void | Promise<void>;
  designation: string;
  isOwner?: boolean;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const TOOL_ICONS: Record<string, any> = {
  'GitHub': <Github className="h-3 w-3" />,
  'Figma': <PenTool className="h-3 w-3" />,
  'Google Drive': <FileText className="h-3 w-3" />,
  'LinkedIn': <Globe className="h-3 w-3" />,
  'Market Research': <BarChart2 className="h-3 w-3" />,
  'Analytics': <TrendingUp className="h-3 w-3" />,
  'Vercel': <Wind className="h-3 w-3" />,
  'Linear': <Layers className="h-3 w-3" />,
  'Canva': <Layout className="h-3 w-3" />,
  'Perplexity AI': <Search className="h-3 w-3" />,
  'ChatGPT': <MessageCircle className="h-3 w-3" />,
  'Claude AI': <MessageCircle className="h-3 w-3" />,
  'Miro': <Layout className="h-3 w-3" />,
  'Google Docs': <FileText className="h-3 w-3" />,
  'Postman': <Globe className="h-3 w-3" />,
  'Docker': <Wind className="h-3 w-3" />,
  'Supabase': <Layers className="h-3 w-3" />,
  'Mailchimp': <Send className="h-3 w-3" />,
  'HubSpot': <TrendingUp className="h-3 w-3" />,
  'Stripe': <BarChart2 className="h-3 w-3" />,
  'DocuSign': <FileText className="h-3 w-3" />,
  'Spline': <Layers className="h-3 w-3" />,
};

const STAGE_LABEL_MAP: Record<string, string> = {
  ideology: 'Ideology & Concept',
  research: 'Research',
  development: 'Development',
  deployment: 'Deployment',
  business: 'Business Strategy',
  marketing: 'Marketing',
  admin_review: 'Admin Review',
  discovery: 'Client Discovery',
  proposals_contracts: 'Contracts & Proposals',
  ui_ux_design: 'Product Design (UI/UX)',
  client_approval: 'Client Design Approval',
  qa_testing: 'QA & Testing',
  client_uat: 'Client Final Review',
  maintenance_support: 'Maintenance & Retainer',
};

const STAGE_DELIVERABLES: Record<string, string[]> = {
  ideology: ['Concept Document', 'Initial Sketches', 'Mind Maps'],
  research: ['Market Research Report', 'Competitor Analysis', 'Feasibility Study'],
  development: ['Technical Architecture', 'API Documentation', 'Source Code Repo'],
  deployment: ['Deployment Guide', 'Infrastructure Diagram', 'QA Test Results'],
  business: ['Business Model Canvas', 'Pricing Model', 'Pitch Deck'],
  marketing: ['Marketing Strategy', 'Campaign Plans', 'Customer Acquisition Funnel'],
  admin_review: ['Final Project Summary', 'Innovation Scoring Sheet'],
  discovery: ['Client Brief', 'Project Scope', 'Requirements Doc'],
  proposals_contracts: ['Cost Estimate (Quote)', 'SLA Agreement', 'Signed Contract'],
  ui_ux_design: ['Wireframes', 'Interactive Prototype', 'Design System'],
  client_approval: ['Final UI Sign-off', 'Feedback Revisions', 'Assets Exported'],
  qa_testing: ['Test Cases', 'Bug Reports', 'Performance Audit'],
  client_uat: ['Client Feedback', 'Beta Access', 'Client Sign-off Form'],
  maintenance_support: ['Handover Documentation', 'Support Contacts', 'Server Monitoring'],
};

const NEXT_TEAM_LABEL: Record<string, string> = {
  // Internal Track
  ideology: 'Research →',
  research: 'Engineering Team →',
  development: 'QA Testing →',   // Fixed: was wrongly pointing to Deployment
  deployment: 'Business Team →', // Internal: goes to Business after deploy
  business: 'Marketing →',
  marketing: 'Admin Review →',
  admin_review: 'Finish',
  // Client Track
  discovery: 'Contracts & Proposals →',
  proposals_contracts: 'Design Team →',
  ui_ux_design: 'Client Approval →',
  client_approval: 'Engineering Team →',
  qa_testing: 'Client Review →',
  client_uat: 'Deployment →',
  // deployment for client is handled inline (see render)
  maintenance_support: 'Retainer Active ✓',
};

const businessSubPanels = [
  {
    icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
    title: 'Business Strategy',
    description: 'Define revenue models, pricing strategy, and growth metrics.',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: <BarChart2 className="h-4 w-4 text-indigo-400" />,
    title: 'Marketing Planning',
    description: 'Plan ad campaigns, social media, and customer acquisition channels.',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    icon: <MessageCircle className="h-4 w-4 text-purple-400" />,
    title: 'Customer Feedback',
    description: 'Collect early user responses, NPS scores, and iterate on feedback.',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
];

export function StageCard({ project, stage, tools, onUpdate, designation, isOwner = true, onToast }: StageCardProps) {
  const [updateText, setUpdateText] = useState('');
  const [githubUrl, setGithubUrl] = useState(project.github_link || '');
  const [loading, setLoading] = useState(false);

  const stageLabel = STAGE_LABEL_MAP[stage.stage_name] ?? stage.stage_name;
  const isActive = stage.status === 'in_progress';
  const isCompleted = stage.status === 'completed';

  const handleLogActivity = async () => {
    if (!updateText.trim() || !project.workspace_id) return;
    setLoading(true);
    try {
      await projectService.logActivity(project.id, designation, stage.stage_name, updateText, project.workspace_id);
      setUpdateText('');
      await onUpdate();
      onToast?.('Update logged successfully!', 'success');
    } catch {
      onToast?.('Failed to log update. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGithub = async () => {
    if (!githubUrl.trim() || !project.workspace_id) return;
    setLoading(true);
    try {
      await projectService.updateGithubLink(project.id, githubUrl);
      await projectService.logActivity(project.id, designation, stage.stage_name, `GitHub repository linked: ${githubUrl}`, project.workspace_id);
      await onUpdate();
      onToast?.('GitHub link updated!', 'success');
    } catch {
      onToast?.('Failed to update GitHub link.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStage = async () => {
    // Exact 9-stage sequence — matches the agreed plan precisely
    const order: StageName[] = project.project_type === 'client' 
      ? ['discovery', 'proposals_contracts', 'ui_ux_design', 'client_approval', 'development', 'qa_testing', 'client_uat', 'deployment', 'maintenance_support']
      : ['ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'];
      
    const currentIndex = order.indexOf(stage.stage_name);
    const nextStage = currentIndex !== -1 && currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

    if (!project.workspace_id) return;

    setLoading(true);
    try {
      await projectService.updateStageStatus(project.id, project.workspace_id, stage.stage_name, nextStage, 'User', designation);
      await onUpdate();
      const nextL = nextStage ? STAGE_LABEL_MAP[nextStage] : 'completion';
      onToast?.(`Stage submitted! Moving to ${nextL}.`, 'success');
    } catch {
      onToast?.('Failed to advance stage. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openNotes = () => window.open(project.drive_link, '_blank');

  return (
    <div className={`bg-[#0c0c0e] rounded-[24px] border-2 flex flex-col h-full transition-all group overflow-hidden relative ${
      isActive ? (project.status === 'code_red' ? 'border-red-500/40 shadow-[0_0_80px_rgba(239,68,68,0.15)] shadow-red-500/5' : 'border-indigo-500/30 shadow-[0_0_80px_rgba(99,102,241,0.1)] shadow-indigo-500/5') : 
      isCompleted ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-white/10 opacity-70'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-start p-4 md:p-6 pb-3 md:pb-4 border-b border-white/5">
        <div>
          <h3 className="text-base md:text-xl font-black text-white capitalize tracking-tight mb-1.5 md:mb-2">{stageLabel}</h3>
          {isCompleted ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest w-fit">
              <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={3} /> Completed
            </div>
          ) : isActive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest w-fit">
              <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse"></div> In Progress
            </div>
          ) : (
            <div className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-white/5 border border-white/5 text-gray-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest w-fit">
              Pending
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project.github_link && (
            <button
              onClick={() => window.open(project.github_link, '_blank')}
              className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 bg-white/5 hover:bg-white/10 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-lg border border-white/10"
            >
              <Github className="h-3 w-3 md:h-4 md:w-4" />
              Repo
            </button>
          )}
          <button
            onClick={openNotes}
            className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-lg border border-blue-400/30"
          >
            <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
            Notes
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 flex flex-col">
        {/* Business sub-panels */}
        {stage.stage_name === 'business' && (
          <div className="space-y-2">
            <p className="text-[9px] md:text-[10px] font-black text-[#6366f1]/60 uppercase tracking-[0.2em]">Workstreams</p>
            {businessSubPanels.map(p => (
              <div key={p.title} className={`flex gap-3 p-3 ${p.bg} border ${p.border} rounded-2xl`}>
                <div className="mt-0.5">{p.icon}</div>
                <div>
                  <p className="text-[11px] font-black text-gray-200 uppercase tracking-wide">{p.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deliverables */}
        <div className="p-3 md:p-4 bg-indigo-500/5 rounded-xl md:rounded-2xl border border-indigo-500/10">
          <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 md:mb-3 flex items-center gap-1.5">
             <FileText className="h-3 w-3" /> Deliverables (Save to Drive)
          </p>
          <ul className="grid grid-cols-1 gap-1.5 md:gap-2">
            {STAGE_DELIVERABLES[stage.stage_name]?.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[10px] md:text-[11px] text-gray-500 font-bold">
                <div className="h-1 w-1 rounded-full bg-indigo-500/40 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Tools */}
        <div>
          <p className="text-[9px] md:text-[10px] font-black text-[#6366f1]/60 uppercase tracking-[0.2em] mb-3 md:mb-5">Recommended Tools</p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {tools.map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-300 rounded-lg md:rounded-xl border border-white/10 hover:border-indigo-500/40 hover:text-white transition-all shadow-lg"
              >
                {TOOL_ICONS[tool.name] || <Globe className="h-3 w-3" />}
                {tool.name}
              </a>
            ))}
          </div>
        </div>

        {/* GitHub link (dev stage only) - Visible to everyone, Editable only by owner */}
        {stage.stage_name === 'development' && (
          <div className="pt-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">GitHub Repository</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                disabled={!isOwner}
                className="flex-1 text-sm px-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50 placeholder-gray-500 disabled:opacity-50"
              />
              {isOwner && (
                <button
                  onClick={handleUpdateGithub}
                  disabled={loading || !githubUrl.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all"
                >
                  <Github className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Activity Input - ONLY for owners */}
        {isActive && isOwner && (
          <div className="flex-1 flex flex-col">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Log Activity & Progress</p>
            <div className="relative flex-1 min-h-[100px]">
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Describe your progress..."
                className="w-full h-full text-sm p-4 pr-12 bg-black/40 border-2 border-white/5 rounded-2xl text-white placeholder-gray-500 outline-none focus:border-indigo-500/30 resize-none font-medium"
              />
              <button
                onClick={handleLogActivity}
                disabled={loading || !updateText.trim()}
                className="absolute bottom-3 right-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          </div>
        )}

        {/* Submit Stage - ONLY for owners */}
        {isActive && isOwner && (
          <div className="pt-4 flex justify-end md:justify-center md:block">
            <button
              onClick={handleNextStage}
              disabled={loading}
              className="w-full md:w-full flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 px-6 md:px-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-widest rounded-[14px] md:rounded-2xl hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(99,102,241,0.3)] disabled:opacity-40 text-[10px] md:text-[11px] transition-all flex-1 md:flex-none"
            >
              <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span>Submit <span className="hidden md:inline">Stage</span></span>
              <span className="text-white/50 ml-1">
                {stage.stage_name === 'deployment' && project.project_type === 'client' 
                  ? 'Maintenance →' 
                  : (NEXT_TEAM_LABEL[stage.stage_name] ?? '→')}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
