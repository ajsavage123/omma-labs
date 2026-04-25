export type UserRole = 'partner' | 'admin';

export type Designation =
  | 'Innovation & Research Team'
  | 'Developer & Engineering Team'
  | 'Business Strategy & Marketing Team';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  code: string;
  role: UserRole;
  designation: Designation;
  used: boolean;
  created_by: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  designation: Designation;
  role: UserRole;
  workspace_id: string;
  bio?: string;
  skills?: string;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'rejected' | 'code_red' | 'paused';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  project_type: 'internal' | 'client';
  description: string;
  deadline?: string;
  client_name?: string;
  client_phone?: string;
  drive_link: string;
  team_members?: string;
  github_link?: string;
  created_by: string;
  status: ProjectStatus;
  created_at: string;
  admin_ratings?: AdminRating[];
}

export type StageName =
  | 'ideology'
  | 'research'
  | 'development'
  | 'deployment'
  | 'business'
  | 'marketing'
  | 'admin_review'
  | 'discovery'
  | 'proposals_contracts'
  | 'ui_ux_design'
  | 'client_approval'
  | 'technical_architecture'
  | 'qa_testing'
  | 'client_uat'
  | 'maintenance_support';

export type StageStatus = 'pending' | 'in_progress' | 'completed';

export interface ProjectStage {
  id: string;
  project_id: string;
  workspace_id: string;
  stage_name: StageName;
  assigned_team: string;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface TimelineLog {
  id: string;
  project_id: string;
  workspace_id: string;
  user_name: string;
  designation: string;
  stage: string;
  update_text: string;
  created_at: string;
}

export interface AdminRating {
  id?: string;
  project_id: string;
  workspace_id: string;
  problem_importance: number;
  technical_feasibility: number;
  market_demand: number;
  impact_potential: number;
  development_complexity: number;
  innovation_score: number;
  innovation_rating?: number;
  engineering_rating?: number;
  business_rating?: number;
  notes: string;
  rated_at?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  users?: {
    full_name: string;
    username: string;
    designation: string;
  };
}

export interface Idea {
  id: string;
  name: string;
  drive_link: string;
  workspace_id: string;
  created_by: string;
  created_at: string;
}

export interface ClientContact {
  id: string;
  name: string;
  contact_number: string;
  website_link: string;
  email: string;
  about: string;
  status: 'online' | 'offline';
  workspace_id: string;
  created_by: string;
  created_at: string;
}
