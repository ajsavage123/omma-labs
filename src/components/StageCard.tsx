import { useState } from 'react';
import type { ProjectStage, StageName } from '@/types';
import { ExternalLink, Plus, Send } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface StageCardProps {
  projectId: string;
  stage: ProjectStage;
  tools: { name: string, url: string }[];
  driveLink: string;
  onUpdate: () => void;
  designation: string;
}

export function StageCard({
  projectId,
  stage,
  tools,
  driveLink,
  onUpdate,
  designation
}: StageCardProps) {
  const [updateText, setUpdateText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogActivity = async () => {
    if (!updateText.trim()) return;
    setLoading(true);
    try {
      await projectService.logActivity(projectId, designation, stage.stage_name, updateText);
      setUpdateText('');
      onUpdate();
    } catch (err) {
      console.error(err);
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
      await projectService.updateStageStatus(
        projectId,
        stage.stage_name,
        nextStage,
        'User', // Will be fetched in service
        designation
      );
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full ${
      stage.status === 'in_progress' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100 opacity-80'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 capitalize">{stage.stage_name.replace('_', ' ')}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            stage.status === 'completed' ? 'bg-green-100 text-green-700' :
            stage.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {stage.status.toUpperCase().replace('_', ' ')}
          </span>
        </div>
        <a
          href={driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Open Project Folder"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>

      <div className="space-y-6 flex-1">
        {/* Tools Section */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tools</h4>
          <div className="flex flex-wrap gap-2">
            {tools.map(tool => (
              <a
                key={tool.name}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-700 rounded-md border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
              >
                {tool.name}
              </a>
            ))}
          </div>
        </div>

        {/* Update Feed Placeholder / Simple Input */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Add Update</h4>
          <div className="relative">
            <textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="What have you completed?"
              className="w-full text-sm p-3 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-20"
            />
            <button
              onClick={handleLogActivity}
              disabled={loading || !updateText.trim()}
              className="absolute bottom-2 right-2 p-1.5 bg-white text-indigo-600 rounded-md border border-gray-200 hover:border-indigo-300 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {stage.status === 'in_progress' && (
        <div className="mt-8">
          <button
            onClick={handleNextStage}
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Send className="mr-2 h-4 w-4" />
            Submit Stage
          </button>
        </div>
      )}
    </div>
  );
}
