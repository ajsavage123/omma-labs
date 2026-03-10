export type UserRole = 'partner' | 'admin';

export type Designation =
  | 'Innovation & Research Team'
  | 'Developer & Engineering Team'
  | 'Business Strategy & Marketing Team';

export interface User {
  id: string;
  username: string;
  designation: Designation;
  role: UserRole;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'rejected';

export interface Project {
  id: string;
  name: string;
  description: string;
  drive_link: string;
  team_members?: string;
  github_link?: string;
  created_by: string;
  status: ProjectStatus;
  created_at: string;
}

export type StageName =
  | 'ideology'
  | 'research'
  | 'development'
  | 'deployment'
  | 'business'
  | 'admin_review';

export type StageStatus = 'pending' | 'in_progress' | 'completed';

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: StageName;
  assigned_team?: string;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface TimelineLog {
  id: string;
  project_id: string;
  user_name: string;
  designation: string;
  stage: string;
  update_text: string;
  created_at: string;
}

export interface AdminRating {
  id?: string;
  project_id: string;
  problem_importance: number;
  technical_feasibility: number;
  market_demand: number;
  impact_potential: number;
  development_complexity: number;
  innovation_score: number;
  notes: string;
  rated_at?: string;
}
