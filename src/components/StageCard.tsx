import { useState } from 'react';
import type { Project, ProjectStage, StageName, TimelineLog } from '@/types';
import { ExternalLink, Plus, Send, FileText, Search, Github, TrendingUp, BarChart2, MessageCircle, CheckCircle2, Globe, Layers, Wind, PenTool, Layout, Users, AlertOctagon, Instagram, MessageSquare, Code2, Link, BookOpen, Sparkles } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface StageCardProps {
  project: Project;
  stage: ProjectStage;
  tools: { name: string, url: string }[];
  onUpdate: () => void | Promise<void>;
  designation: string;
  role?: string;
  isOwner?: boolean;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  logs?: TimelineLog[];
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
  'Instagram': <Instagram className="h-3 w-3" />,
  'WhatsApp': <MessageSquare className="h-3 w-3" />,
  'Notion': <Layout className="h-3 w-3" />,
  'Google Meet': <Globe className="h-3 w-3" />,
  'Quotation Generator': <FileText className="h-3 w-3" />,
  'Client Contract Form': <Link className="h-3 w-3" />,
  'Google Sites': <Globe className="h-3 w-3" />,
  'Lovable': <Code2 className="h-3 w-3" />,
  'CodeRabbit': <MessageSquare className="h-3 w-3" />,
  'Developer Guide': <BookOpen className="h-3 w-3" />,
  'Pricing and Tech Stacks List': <BarChart2 className="h-3 w-3" />,
  'Client Requirement Form': <FileText className="h-3 w-3" />,
  'Service Menu Card': <Layout className="h-3 w-3" />,
  'Contact Directory': <Users className="h-3 w-3" />,
  'Loom': <Wind className="h-3 w-3" />,
  'Typeform': <FileText className="h-3 w-3" />,
  'Sentry': <AlertOctagon className="h-3 w-3" />,
  'Playwright': <CheckCircle2 className="h-3 w-3" />,
  'DigitalOcean': <Globe className="h-3 w-3" />,
  'Cloudflare': <Layers className="h-3 w-3" />,
  'Slack': <MessageCircle className="h-3 w-3" />,
  'Hotjar': <Search className="h-3 w-3" />,
  'Meta Ads': <TrendingUp className="h-3 w-3" />,
  'Google Analytics': <BarChart2 className="h-3 w-3" />,
  'Midjourney': <Sparkles className="h-3 w-3" />,
  'Pitch': <Layout className="h-3 w-3" />,
  'Adobe Illustrator': <PenTool className="h-3 w-3" />,
  'Ahrefs': <TrendingUp className="h-3 w-3" />,
  'SEMrush': <BarChart2 className="h-3 w-3" />,
  'Dribbble': <Globe className="h-3 w-3" />,
  'Behance': <Layout className="h-3 w-3" />,
  'Tailwind CSS': <Wind className="h-3 w-3" />,
  'React Docs': <Code2 className="h-3 w-3" />,
  'Next.js': <Globe className="h-3 w-3" />,
  'QuickBooks': <BarChart2 className="h-3 w-3" />,
};

const STAGE_TOOLS_OVERRIDE: Record<string, { name: string, url: string, adminOnly?: boolean }[]> = {
  // --- Client Track ---
  discovery: [
    { name: 'Google Meet', url: 'https://meet.google.com' },
    { name: 'Notion', url: 'https://notion.so' },
    { name: 'Instagram', url: 'https://instagram.com' },
    { name: 'WhatsApp', url: 'https://whatsapp.com' },
    { name: 'Contact Directory', url: '/contacts', adminOnly: true },
    { name: 'Pricing and Tech Stacks List', url: 'https://docs.google.com/document/d/1tguGmxprvBTQUc66-46vW4GJI8QN6OD-/edit?usp=sharing&ouid=107863003854110664232&rtpof=true&sd=true' },
    { name: 'Service Menu Card', url: '/service-menu' },
    { name: 'Client Requirement Form', url: '/requirement-form' },
    { name: 'Typeform', url: 'https://typeform.com' },
    { name: 'Loom', url: 'https://loom.com' },
  ],
  proposals_contracts: [
    { name: 'Quotation Generator', url: '/quotation' },
    { name: 'Client Contract Form', url: 'https://docs.google.com/document/d/1UlHan7TINnYPUCPsFB_H7UuINEteGIBI/edit?usp=sharing&ouid=107863003854110664232&rtpof=true&sd=true' },
    { name: 'DocuSign', url: 'https://docusign.com' },
    { name: 'Stripe', url: 'https://stripe.com' },
  ],
  ui_ux_design: [
    { name: 'Figma', url: 'https://figma.com' },
    { name: 'Dribbble', url: 'https://dribbble.com' },
    { name: 'Behance', url: 'https://behance.net' },
    { name: 'Canva', url: 'https://canva.com' },
    { name: 'Google Sites', url: 'https://sites.google.com' },
    { name: 'Lovable', url: 'https://lovable.dev' },
    { name: 'Spline', url: 'https://spline.design' },
  ],
  client_approval: [
    { name: 'Loom', url: 'https://loom.com' },
    { name: 'DocuSign', url: 'https://docusign.com' },
    { name: 'WhatsApp', url: 'https://whatsapp.com' },
    { name: 'Google Meet', url: 'https://meet.google.com' },
  ],
  development: [
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Developer Guide', url: 'https://docs.google.com/document/d/1tguGmxprvBTQUc66-46vW4GJI8QN6OD-/edit?usp=sharing&ouid=107863003854110664232&rtpof=true&sd=true' },
    { name: 'Supabase', url: 'https://supabase.com' },
    { name: 'Vercel', url: 'https://vercel.com' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com/docs' },
    { name: 'React Docs', url: 'https://react.dev' },
    { name: 'Linear', url: 'https://linear.app' },
  ],
  qa_testing: [
    { name: 'CodeRabbit', url: 'https://coderabbit.ai' },
    { name: 'Sentry', url: 'https://sentry.io' },
    { name: 'Playwright', url: 'https://playwright.dev' },
    { name: 'Postman', url: 'https://postman.com' },
  ],
  client_uat: [
    { name: 'Loom', url: 'https://loom.com' },
    { name: 'Hotjar', url: 'https://hotjar.com' },
    { name: 'WhatsApp', url: 'https://whatsapp.com' },
  ],
  deployment: [
    { name: 'Vercel', url: 'https://vercel.com' },
    { name: 'DigitalOcean', url: 'https://digitalocean.com' },
    { name: 'Cloudflare', url: 'https://cloudflare.com' },
    { name: 'Google Drive', url: 'https://drive.google.com' },
  ],
  maintenance_support: [
    { name: 'Slack', url: 'https://slack.com' },
    { name: 'HubSpot', url: 'https://hubspot.com' },
    { name: 'Stripe', url: 'https://stripe.com' },
    { name: 'Google Analytics', url: 'https://analytics.google.com' },
  ],

  // --- Internal Track ---
  ideology: [
    { name: 'Miro', url: 'https://miro.com' },
    { name: 'ChatGPT', url: 'https://chat.openai.com' },
    { name: 'Perplexity AI', url: 'https://perplexity.ai' },
    { name: 'Midjourney', url: 'https://midjourney.com' },
    { name: 'Notion', url: 'https://notion.so' },
  ],
  research: [
    { name: 'Google Scholar', url: 'https://scholar.google.com' },
    { name: 'Perplexity AI', url: 'https://perplexity.ai' },
    { name: 'HubSpot', url: 'https://hubspot.com' },
    { name: 'Typeform', url: 'https://typeform.com' },
  ],
  business: [
    { name: 'Stripe', url: 'https://stripe.com' },
    { name: 'Pitch', url: 'https://pitch.com' },
    { name: 'Google Sheets', url: 'https://sheets.google.com' },
    { name: 'LinkedIn', url: 'https://linkedin.com' },
  ],
  marketing: [
    { name: 'LinkedIn', url: 'https://linkedin.com' },
    { name: 'Canva', url: 'https://canva.com' },
    { name: 'Ahrefs', url: 'https://ahrefs.com' },
    { name: 'SEMrush', url: 'https://semrush.com' },
    { name: 'Meta Ads', url: 'https://adsmanager.facebook.com' },
    { name: 'Google Analytics', url: 'https://analytics.google.com' },
    { name: 'Mailchimp', url: 'https://mailchimp.com' },
  ],
  admin_review: [
    { name: 'Google Drive', url: 'https://drive.google.com' },
    { name: 'DocuSign', url: 'https://docusign.com' },
    { name: 'Tableau', url: 'https://tableau.com' },
  ],
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
  ideology: ['Core Concept Doc', 'Feature Mindmap', 'Initial Sketches'],
  research: ['Market Research Report', 'Competitor Analysis', 'Feasibility Doc'],
  development: ['Technical Architecture', 'API Documentation', 'Source Code Repo'],
  deployment: ['Deployment Guide', 'Infrastructure Diagram', 'QA Test Results'],
  business: ['Business Model Canvas', 'Pricing Model', 'Pitch Deck'],
  marketing: ['Marketing Strategy', 'Campaign Plans', 'Customer Acquisition Funnel'],
  admin_review: ['Final Project Summary', 'Innovation Scoring Sheet'],
  discovery: ['Client Brief (Save to Drive)', 'Project Scope (Save to Drive)', 'Requirements Doc (Save to Drive)'],
  proposals_contracts: ['Cost Estimate (Quote)', 'SLA Agreement', 'Signed Contract'],
  ui_ux_design: ['Wireframes', 'Interactive Prototype', 'Design System'],
  client_approval: ['Final UI Sign-off', 'Feedback Revisions', 'Assets Exported'],
  qa_testing: ['Test Cases', 'Bug Reports', 'Performance Audit'],
  client_uat: ['Client Feedback', 'Beta Access', 'Client Sign-off Form'],
  maintenance_support: ['Handover Documentation', 'Support Contacts', 'Server Monitoring'],
};

const STAGE_MISSIONS: Record<string, string> = {
  ideology: 'Refine the core "Why" and define the primary problem the venture aims to solve.',
  research: 'Validate the market gap, analyze competitors, and verify technical feasibility.',
  development: 'Build the functional product/MVP using the latest modern engineering standards.',
  deployment: 'Propel the code into production and ensure a stable, scalable environment.',
  business: 'Construct the revenue engine, pricing model, and long-term business strategy.',
  marketing: 'Establish brand dominance and execute the first customer acquisition campaign.',
  admin_review: 'Internal quality control to ensure the project meets firm excellence standards.',
  discovery: 'Deep-dive into client needs to establish a solid foundation and clear scope.',
  proposals_contracts: 'Formalize the engagement terms, budgeting, and legal agreements.',
  ui_ux_design: 'Craft a premium visual experience that translates requirements into an interface.',
  client_approval: 'Iterate with the client until every visual detail is signed-off and approved.',
  qa_testing: 'Systematic testing to eliminate bugs and ensure maximum software reliability.',
  client_uat: 'Allow the client to test the product in a real-world environment before launch.',
  maintenance_support: 'Provide ongoing stability, performance updates, and technical support.',
};

const STAGE_ROLES: Record<string, string> = {
  ideology: 'Innovation Team brainstorms; Partners define the long-term vision.',
  research: 'Research Team validates market data; Engineering provides technical feasibility checks.',
  development: 'Engineering Team leads coding; Design Team ensures UI fidelity is maintained.',
  deployment: 'DevOps & Engineering orchestrate the launch; Admin monitors server stability.',
  business: 'Business Strategy Team defines RevOps; Partners approve the financial models.',
  marketing: 'Marketing Team executes campaigns; Creative Team handles brand assets.',
  admin_review: 'Partners & Admin perform the final "Go/No-Go" evaluation.',
  discovery: 'Client Success Leads gather requirements; Admin estimates initial resource needs.',
  proposals_contracts: 'Legal & Finance handle contracts; Client Success presents the roadmap.',
  ui_ux_design: 'Product Designers create layouts; Engineering reviews for technical constraints.',
  client_approval: 'Client Success manages communications; Design iterates based on feedback.',
  qa_testing: 'QA Engineers run test suites; Developers fix identified bottlenecks.',
  client_uat: 'Client Success monitors user testing; Engineering addresses final refinements.',
  maintenance_support: 'Accounts Team manages the relationship; Engineering provides on-call support.',
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

export function StageCard({ project, stage, tools, onUpdate, designation, role, isOwner = true, onToast, logs }: StageCardProps) {
  const [updateText, setUpdateText] = useState('');
  const [githubUrl, setGithubUrl] = useState(project.github_link || '');
  const [loading, setLoading] = useState(false);

  const stageLabel = STAGE_LABEL_MAP[stage.stage_name] ?? stage.stage_name;
  const isActive = stage.status === 'in_progress';
  const isCompleted = stage.status === 'completed';

  // Find latest admin revert for this stage
  const revertLog = logs?.find(l => 
    l.stage === stage.stage_name && 
    l.update_text.includes('⚠️ Admin sent project back to')
  );

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
        {/* Quick Brief: Mission of the stage */}
        <div className="p-3 md:p-4 bg-indigo-500/5 rounded-xl md:rounded-2xl border border-indigo-500/10 mb-4">
          <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
             <Layout className="h-3 w-3" /> Mission Goal
          </p>
          <p className="text-[11px] md:text-[13px] text-gray-200 font-bold leading-relaxed mb-4">
            {STAGE_MISSIONS[stage.stage_name] || "Continue refining the project output and maintain standard excellence."}
          </p>

          <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 pt-2 border-t border-indigo-500/10">
             <Users className="h-3 w-3" /> Active Roles
          </p>
          <p className="text-[11px] md:text-[12px] text-gray-400 font-bold leading-relaxed">
            {STAGE_ROLES[stage.stage_name] || "All team members contribute to this milestone."}
          </p>
        </div>

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

        {/* Admin Feedback / Revert Reason */}
        {isActive && revertLog && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl border-l-[6px] border-l-amber-500 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Admin Rework Required</span>
            </div>
            <p className="text-[12px] text-amber-200 font-bold leading-relaxed italic">
              "{revertLog.update_text.split('Feedback:')[1]?.trim() || 'Please review and redo this stage.'}"
            </p>
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
            {(STAGE_TOOLS_OVERRIDE[stage.stage_name] || tools).map(tool => {
              if (tool.adminOnly && role !== 'admin' && role !== 'partner') {
                return null;
              }

              return (
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
              );
            })}
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
