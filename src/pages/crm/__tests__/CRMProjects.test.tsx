import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CRMProjects from '../CRMProjects';

// Mock CRMDataContext
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

describe('CRMProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when loading', () => {
    mockUseCRMData.mockReturnValue({
      leads: [],
      loading: true,
      teamMembers: [],
      selectedSalesRepId: 'all',
      crmViewMode: 'team',
    });

    const { container } = render(<CRMProjects />);
    expect(container.firstChild).toBeNull();
  });

  it('renders empty state when no leads qualify for onboarding', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', company_name: 'Lead Inc', status: 'New Leads' },
        { id: '2', company_name: 'Lost Corp', status: 'Lost' },
      ],
      loading: false,
      teamMembers: [],
      selectedSalesRepId: 'all',
      crmViewMode: 'team',
    });

    render(<CRMProjects />);
    expect(screen.getByText('Onboarding Projects')).toBeInTheDocument();
    expect(screen.getByText('Active client onboarding workflows (0 clients)')).toBeInTheDocument();
    expect(screen.getByText('No active onboarding projects.')).toBeInTheDocument();
  });

  it('renders onboarding projects with calculated milestones and progress', () => {
    const mockLeads = [
      {
        id: 'p1',
        company_name: 'Acme Corp',
        status: 'Won (Converted)',
        estimated_value: 50000,
        project_milestones_status: {
          Design: 'Completed',
          Development: 'Completed',
          Testing: 'Pending',
          Delivery: 'Pending',
        },
      },
      {
        id: 'p2',
        company_name: 'Globex Ltd',
        status: 'Onboarding',
        estimated_value: 120000,
        project_milestones_status: {
          Design: 'Completed',
          Development: 'Completed',
          Testing: 'Completed',
          Delivery: 'Completed',
        },
      },
      {
        id: 'p3',
        company_name: 'Initech',
        status: 'Completed',
        estimated_value: 0,
        // no project_milestones_status -> defaults to all Pending
      },
    ];

    mockUseCRMData.mockReturnValue({
      leads: mockLeads,
      loading: false,
      teamMembers: [],
      selectedSalesRepId: 'all',
      crmViewMode: 'team',
    });

    render(<CRMProjects />);

    expect(screen.getByText('Active client onboarding workflows (3 clients)')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Globex Ltd Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Initech Onboarding')).toBeInTheDocument();

    // Acme Corp: 2/4 completed -> Partial (50%)
    expect(screen.getByText('2 / 4 milestones')).toBeInTheDocument();
    expect(screen.getByText('Stage: Won (Converted)')).toBeInTheDocument();

    // Globex Ltd: 4/4 completed -> Completed (100%)
    expect(screen.getByText('4 / 4 milestones')).toBeInTheDocument();
    expect(screen.getByText('Stage: Onboarding')).toBeInTheDocument();

    // Initech: 0/4 completed -> Pending (0%)
    expect(screen.getByText('0 / 4 milestones')).toBeInTheDocument();
    expect(screen.getByText('Stage: Completed')).toBeInTheDocument();

    // Check formatted values
    expect(screen.getByText(new RegExp(`Value: ₹${(50000).toLocaleString()}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Value: ₹${(120000).toLocaleString()}`))).toBeInTheDocument();
  });

  it('displays correct filter label based on crmViewMode and selectedSalesRepId', () => {
    // Mode = 'mine'
    mockUseCRMData.mockReturnValue({
      leads: [],
      loading: false,
      teamMembers: [{ id: 'u1', full_name: 'John Doe', username: 'johnd' }],
      selectedSalesRepId: 'u1',
      crmViewMode: 'mine',
    });

    const { rerender } = render(<CRMProjects />);
    expect(screen.getByText('My Projects')).toBeInTheDocument();

    // Mode = 'team', selectedSalesRepId = 'all'
    mockUseCRMData.mockReturnValue({
      leads: [],
      loading: false,
      teamMembers: [{ id: 'u1', full_name: 'John Doe', username: 'johnd' }],
      selectedSalesRepId: 'all',
      crmViewMode: 'team',
    });
    rerender(<CRMProjects />);
    expect(screen.getByText('All Team Projects')).toBeInTheDocument();

    // Mode = 'team', selectedSalesRepId = 'u1' (specific rep)
    mockUseCRMData.mockReturnValue({
      leads: [],
      loading: false,
      teamMembers: [{ id: 'u1', full_name: 'John Doe', username: 'johnd' }],
      selectedSalesRepId: 'u1',
      crmViewMode: 'team',
    });
    rerender(<CRMProjects />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
