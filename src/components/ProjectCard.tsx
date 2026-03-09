import type { Project, ProjectStage } from '@/types';
import { Calendar, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project & { project_stages: ProjectStage[] };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const stages = project.project_stages || [];
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const totalStages = stages.length || 6;
  const progress = Math.round((completedStages / totalStages) * 100);

  const currentStage = stages.find(s => s.status === 'in_progress')?.stage_name ||
                   (completedStages === totalStages ? 'completed' : 'pending');

  const lastUpdated = project.created_at; // Should ideally be from logs or stages

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {project.name}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          project.status === 'active' ? 'bg-green-100 text-green-700' :
          project.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
        }`}>
          {project.status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center text-sm text-gray-500">
          <ChevronRight className="h-4 w-4 mr-1 text-indigo-500" />
          <span className="font-medium text-gray-700 mr-2">Stage:</span>
          <span className="capitalize">{currentStage.replace('_', ' ')}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Progress</span>
            <span className="text-indigo-600 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(lastUpdated).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            {stages.find(s => s.status === 'in_progress')?.assigned_team || 'Multiple Teams'}
          </div>
        </div>
      </div>
    </div>
  );
}
