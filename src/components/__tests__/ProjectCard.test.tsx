import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProject = {
  id: '1',
  name: 'Innovation Hub',
  description: 'Test project',
  status: 'active',
  created_at: new Date().toISOString(),
  project_stages: [
    { id: '1', project_id: '1', stage_name: 'ideology', status: 'completed', started_at: '2025-01-01', completed_at: '2025-01-02' },
    { id: '2', project_id: '1', stage_name: 'research', status: 'in_progress', started_at: '2025-01-03' },
  ],
  drive_link: 'http://drive.com',
  github_link: '',
  team_members: 'Team Alpha',
  created_by: 'user1',
};

describe('ProjectCard', () => {
  it('renders project name and status', () => {
    render(
      <BrowserRouter>
        <ProjectCard project={mockProject as any} />
      </BrowserRouter>
    );

    expect(screen.getByText('Innovation Hub')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('displays the current stage label', () => {
    render(
      <BrowserRouter>
        <ProjectCard project={mockProject as any} />
      </BrowserRouter>
    );

    expect(screen.getByText('Research')).toBeInTheDocument();
  });

  it('calculates progress correctly (1/6 completed)', () => {
    render(
      <BrowserRouter>
        <ProjectCard project={mockProject as any} />
      </BrowserRouter>
    );

    // 1 completed stage out of 6 (totalStages is 6 in component)
    // 1/6 = 16.6... -> 17%
    expect(screen.getByText('17%')).toBeInTheDocument();
  });

  it('navigates to project details on click', () => {
    render(
      <BrowserRouter>
        <ProjectCard project={mockProject as any} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Innovation Hub'));
    expect(mockNavigate).toHaveBeenCalledWith('/project/1');
  });
});
