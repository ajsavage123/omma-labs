import { useState } from 'react';
import type { Project, ProjectStage, StageName } from '@/types';
import { ExternalLink, Plus, Send, FileText, Check, Search, MessageSquare, Figma } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface StageCardProps {
  project: Project;
  stage: ProjectStage;
  tools: { name: string, url: string }[];
  onUpdate: () => void;
  designation: string;
}

export function StageCard({
  project,
  stage,
  tools,
  onUpdate,
  designation
}: StageCardProps) {
  const [updateText, setUpdateText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogActivity = async () => {
    if (!updateText.trim()) return;
    setLoading(true);
    try {
      await projectService.logActivity(project.id, designation, stage.stage_name, updateText);
      setUpdateText('');
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStage = async () => {
    const order: StageName[] = ['ideology', 'research', 'development', 'deployment', 'business', 'marketing', 'admin_review'];
    const currentIndex = order.indexOf(stage.stage_name);
    const nextStage = currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

    setLoading(true);
    try {
      await projectService.updateStageStatus(
        project.id,
        stage.stage_name,
        nextStage,
        'User',
        designation
      );
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDeliverables = (name: string) => {
    const deliverables: Record<string, string[]> = {
      ideology: ['Concept Document', 'Initial Sketches', 'Mind Maps'],
      research: ['Market Research Report', 'Competitor Analysis', 'Feasibility Study'],
      development: ['Source Code Repository', 'API Documentation', 'Technical Specs'],
      deployment: ['Cloud Configuration', 'Production URL', 'Monitoring Setup'],
      business: ['Business Model Canvas', 'Revenue Projections', 'Partnership List'],
      marketing: ['Brand Guidelines', 'Social Media Kit', 'Launch Campaign'],
      admin_review: ['Final Report', 'Compliance Check', 'Approval Sign-off']
    };
    return deliverables[name] || ['Documentation', 'Progress Updates'];
  };

  const getToolIcon = (name: string) => {
    const low = name.toLowerCase();
    if (low.includes('perplexity')) return <Search className="h-3 w-3 text-[#f59e0b]" />;
    if (low.includes('chatgpt') || low.includes('claude')) return <MessageSquare className="h-3 w-3 text-[#fbbf24]" />;
    if (low.includes('figma')) return <Figma className="h-3 w-3 text-[#ec4899]" />;
    if (low.includes('drive') || low.includes('docs')) return <FileText className="h-3 w-3 text-[#8b5cf6]" />;
    return <ExternalLink className="h-3 w-3 text-gray-500" />;
  };

  return (
    <div className={`bg-[#0c0c0e] rounded-[24px] border-2 p-8 flex flex-col h-full transition-all group overflow-hidden relative ${
      stage.status === 'in_progress' ? 'border-[#6366f1]/20 shadow-[0_0_50px_rgba(99,102,241,0.05)]' : 
      stage.status === 'completed' ? 'border-[#22c55e]/10' : 'border-white/5 opacity-70'
    }`}>
      
      {/* Status & Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-xl font-black text-white capitalize tracking-tight mb-2">{stage.stage_name.replace('_', ' ')}</h3>
          {stage.status === 'completed' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-[9px] font-black uppercase tracking-widest">
              <Check className="h-3 w-3" strokeWidth={3} /> Completed
            </div>
          ) : stage.status === 'in_progress' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#818cf8] text-[9px] font-black uppercase tracking-widest">
              <div className="h-1.5 w-1.5 bg-[#6366f1] rounded-full animate-pulse"></div> In Progress
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-gray-700 text-[9px] font-black uppercase tracking-widest">
              Pending
            </div>
          )}
        </div>
        <button
          onClick={() => window.open(project.drive_link, "_blank")}
          className="flex items-center gap-3 px-5 py-2.5 bg-[#6366f1]/10 text-[#6366f1] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#6366f1] hover:text-white transition-all shadow-[0_0_20px_rgba(99,102,241,0.1)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
        >
          <ExternalLink className="h-4 w-4" />
          Notes
        </button>
      </div>

      <div className="space-y-8 flex-1">
        {/* Deliverables Section */}
        <div className="p-6 rounded-2xl bg-[#11111d] border border-white/5">
          <div className="flex items-center gap-3 mb-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            <FileText className="h-4 w-4" />
            Team Deliverables (Save to Drive)
          </div>
          <ul className="space-y-3">
            {getDeliverables(stage.stage_name).map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 text-xs font-bold text-gray-500">
                <div className={`h-1.5 w-1.5 rounded-full ${stage.status === 'completed' ? 'bg-[#22c55e]' : 'bg-[#6366f1]'}`}></div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Tools */}
        <div>
          <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-[0.3em] mb-4">Recommended Tools</h4>
          <div className="flex flex-wrap gap-2">
            {tools.concat([{name: 'Figma', url: 'https://figma.com'}]).slice(0, 5).map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-600 rounded-full border border-white/5 hover:border-[#6366f1]/50 hover:text-white transition-all"
              >
                {getToolIcon(tool.name)}
                {tool.name}
              </a>
            ))}
          </div>
        </div>

        {/* Action Area */}
        {stage.status === 'in_progress' ? (
          <div>
            <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-[0.3em] mb-4">Log Activity & Progress</h4>
            <div className="relative">
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Describe your progress or documents added..."
                className="w-full text-sm p-5 bg-black/40 border-2 border-white/5 rounded-[22px] text-white placeholder-gray-800 focus:ring-1 focus:ring-[#6366f1]/50 outline-none resize-none h-32"
              />
              <button
                onClick={handleLogActivity}
                disabled={loading || !updateText.trim()}
                className="absolute bottom-4 right-4 h-10 w-10 bg-[#1e1e30] border border-[#6366f1]/30 text-[#6366f1] rounded-xl flex items-center justify-center hover:bg-[#6366f1] hover:text-white transition-all disabled:opacity-30 self-end shadow-lg"
              >
                <Plus className="h-6 w-6" strokeWidth={3} />
              </button>
            </div>
            
            <button
              onClick={handleNextStage}
              disabled={loading}
              className="w-full mt-6 py-4 flex items-center justify-center gap-3 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Submit Stage <span className="text-white/60 ml-1">Engineering Team →</span>
            </button>
          </div>
        ) : stage.status === 'completed' ? (
          <div className="py-4 px-6 rounded-2xl bg-[#22c55e]/5 border border-[#22c55e]/10 flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e]">
                <Check className="h-4 w-4" strokeWidth={4} />
             </div>
             <span className="text-[#22c55e] text-xs font-black uppercase tracking-widest">Stage completed</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
