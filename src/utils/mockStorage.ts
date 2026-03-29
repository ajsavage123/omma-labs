import type { Project, ProjectStage, TimelineLog, Idea, ClientContact, User, ChatMessage } from '@/types';

const STORAGE_KEYS = {
  PROJECTS: 'mock_projects',
  STAGES: 'mock_project_stages',
  LOGS: 'mock_timeline_logs',
  IDEAS: 'mock_ideas',
  CONTACTS: 'mock_client_contacts',
  USERS: 'mock_users',
  MESSAGES: 'mock_chat_messages',
  MEETINGS: 'mock_meetings',
  LIBRARY_DOCS: 'mock_library_docs',
};

const INITIAL_USER: User = {
  id: 'mock-user-id',
  username: 'Admin',
  full_name: 'Local Developer',
  designation: 'Innovation & Research Team',
  role: 'admin',
  workspace_id: 'mock-workspace-id',
  created_at: new Date().toISOString(),
};

/**
 * Utility to manage mock data in localStorage.
 */
export const mockStorage = {
  get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  set<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Projects
  getProjects(): (Project & { project_stages: ProjectStage[] })[] {
    const projects = this.get<Project>(STORAGE_KEYS.PROJECTS);
    const stages = this.get<ProjectStage>(STORAGE_KEYS.STAGES);
    return projects.map((p) => ({
      ...p,
      project_stages: stages.filter((s) => s.project_id === p.id),
    }));
  },

  saveProject(project: Project, stages: ProjectStage[]): void {
    const projects = this.get<Project>(STORAGE_KEYS.PROJECTS);
    const allStages = this.get<ProjectStage>(STORAGE_KEYS.STAGES);
    
    this.set(STORAGE_KEYS.PROJECTS, [...projects.filter((p) => p.id !== project.id), project]);
    this.set(STORAGE_KEYS.STAGES, [...allStages.filter((s) => s.project_id !== project.id), ...stages]);
  },

  updateProject(id: string, updates: Partial<Project>): void {
    const projects = this.get<Project>(STORAGE_KEYS.PROJECTS);
    this.set(STORAGE_KEYS.PROJECTS, projects.map(p => p.id === id ? { ...p, ...updates } : p));
  },

  // Logs
  getLogs(projectId?: string): TimelineLog[] {
    const logs = this.get<TimelineLog>(STORAGE_KEYS.LOGS);
    return projectId ? logs.filter((l) => l.project_id === projectId) : logs;
  },

  addLog(log: TimelineLog): void {
    const logs = this.get<TimelineLog>(STORAGE_KEYS.LOGS);
    this.set(STORAGE_KEYS.LOGS, [log, ...logs]);
  },

  // Auth
  getMockUser(): User {
    const users = this.get<User>(STORAGE_KEYS.USERS);
    if (users.length === 0) {
      this.set(STORAGE_KEYS.USERS, [INITIAL_USER]);
      return INITIAL_USER;
    }
    return users[0];
  },

  // Ideas & Contacts
  getIdeas(): Idea[] { return this.get<Idea>(STORAGE_KEYS.IDEAS); },
  addIdea(idea: Idea): void { this.set(STORAGE_KEYS.IDEAS, [...this.get<Idea>(STORAGE_KEYS.IDEAS), idea]); },
  deleteIdea(id: string): void { this.set(STORAGE_KEYS.IDEAS, this.get<Idea>(STORAGE_KEYS.IDEAS).filter(i => i.id !== id)); },

  getContacts(): ClientContact[] { return this.get<ClientContact>(STORAGE_KEYS.CONTACTS); },
  addContact(c: ClientContact): void { this.set(STORAGE_KEYS.CONTACTS, [...this.get<ClientContact>(STORAGE_KEYS.CONTACTS), c]); },

  // Messages
  getMessages(): ChatMessage[] { return this.get<ChatMessage>(STORAGE_KEYS.MESSAGES); },
  addMessage(m: ChatMessage): void { this.set(STORAGE_KEYS.MESSAGES, [...this.get<ChatMessage>(STORAGE_KEYS.MESSAGES), m]); },

  // Meetings
  getMeetings(): any[] { return this.get(STORAGE_KEYS.MEETINGS); },
  addMeeting(m: any): void { this.set(STORAGE_KEYS.MEETINGS, [...this.get(STORAGE_KEYS.MEETINGS), m]); },
  deleteMeeting(id: string): void { this.set(STORAGE_KEYS.MEETINGS, this.get(STORAGE_KEYS.MEETINGS).filter((m: any) => m.id !== id)); },

  // Library
  getLibraryDocs(): any[] { return this.get(STORAGE_KEYS.LIBRARY_DOCS); },
  addLibraryDoc(d: any): void { this.set(STORAGE_KEYS.LIBRARY_DOCS, [...this.get(STORAGE_KEYS.LIBRARY_DOCS), d]); },
  deleteLibraryDoc(id: string): void { this.set(STORAGE_KEYS.LIBRARY_DOCS, this.get(STORAGE_KEYS.LIBRARY_DOCS).filter((d: any) => d.id !== id)); }
};
