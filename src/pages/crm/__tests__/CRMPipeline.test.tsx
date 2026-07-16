import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
const { mockEq } = vi.hoisted(() => {
  const mEq = vi.fn();
  mEq.mockReturnValue({ eq: mEq, order: vi.fn().mockResolvedValue({ data: [], error: null }) });
  return { mockEq: mEq };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
      delete: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    }),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'Business Strategy & Marketing Team' },
  }),
}));

// Mock useToast
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn() },
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

// Mock Toast component
vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

// Mock CRMDataContext
const mockRefreshLeads = vi.fn();
const mockRefreshTasks = vi.fn();
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMPipeline from '../CRMPipeline';

const renderPipeline = (initialRoute = '/crm/pipeline') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <CRMPipeline />
    </MemoryRouter>
  );
};

const sampleLeads = [
  {
    id: 'l1', company_name: 'Alpha Corp', contact_person: 'John', email: 'john@alpha.com',
    phone: '+919876543210', estimated_value: 50000, status: 'New Leads', is_pinned: false,
    service_interest: 'Web Dev', business_type: 'IT', website: 'alpha.com', external_link: '',
    notes: '', created_at: '2026-01-15T10:00:00Z', crm_tasks: [],
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
  },
  {
    id: 'l2', company_name: 'Beta LLC', contact_person: 'Jane', email: 'jane@beta.com',
    phone: '+919876543211', estimated_value: 100000, status: 'Interested', is_pinned: true,
    service_interest: 'SEO', business_type: 'Marketing', website: '', external_link: '',
    notes: 'follow up needed', created_at: '2026-02-20T12:00:00Z',
    crm_tasks: [{ id: 'tk1', title: 'Call back', status: 'Pending', due_date: '2026-07-20' }],
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
  },
  {
    id: 'l3', company_name: 'Gamma Inc', contact_person: 'Bob', email: '',
    phone: '', estimated_value: 30000, status: 'Won (Converted)', is_pinned: false,
    service_interest: '', business_type: 'Construction', website: '', external_link: '',
    notes: '', created_at: '2026-03-01T08:00:00Z', crm_tasks: [],
    assigned_to: null, assigned_user: null,
  },
];

describe('CRMPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseCRMData.mockReturnValue({
      leads: [], tasks: [], loading: true,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    const { container } = renderPipeline();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders pipeline header after loading', () => {
    mockUseCRMData.mockReturnValue({
      leads: [], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    expect(screen.getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
  });

  it('renders pipeline stages', () => {
    mockUseCRMData.mockReturnValue({
      leads: sampleLeads, tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();

    // Should render stage headers
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Interested')).toBeInTheDocument();
  });

  it('places leads in correct stage columns', () => {
    mockUseCRMData.mockReturnValue({
      leads: sampleLeads, tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();

    // Alpha Corp should be in "New Leads" stage
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    // Beta LLC should be in "Interested" stage
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('shows lead estimated value in cards', () => {
    mockUseCRMData.mockReturnValue({
      leads: [sampleLeads[0]], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    expect(screen.getAllByText('₹50,000').length).toBeGreaterThan(0);
  });

  it('shows search input and filters leads', () => {
    mockUseCRMData.mockReturnValue({
      leads: sampleLeads, tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Beta' } });

    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument();
  });

  it('shows empty stage message when no leads in a stage', () => {
    mockUseCRMData.mockReturnValue({
      leads: [], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    // All stages should show "Empty Stage"
    const emptyLabels = screen.getAllByText('Empty Stage');
    expect(emptyLabels.length).toBeGreaterThan(0);
  });

  it('shows "Add Lead" button', () => {
    mockUseCRMData.mockReturnValue({
      leads: [], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    expect(screen.getByText('Add New Lead')).toBeInTheDocument();
  });

  it('opens add lead modal', async () => {
    mockUseCRMData.mockReturnValue({
      leads: [], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    fireEvent.click(screen.getByText('Add New Lead'));

    await waitFor(() => {
      expect(screen.getByText('New Opportunity')).toBeInTheDocument();
    });
  });

  it('shows stage value totals', () => {
    mockUseCRMData.mockReturnValue({
      leads: sampleLeads, tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    // New Leads stage should show ₹50,000 total
    // These are formatted in the stage header
    expect(screen.getAllByText('₹50,000').length).toBeGreaterThan(0);
  });

  it('shows upcoming action on lead card with pending tasks', () => {
    mockUseCRMData.mockReturnValue({
      leads: [sampleLeads[1]], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    expect(screen.getByText('Upcoming Action')).toBeInTheDocument();
    expect(screen.getByText('Call back')).toBeInTheDocument();
  });

  it('shows recent note on lead card', () => {
    mockUseCRMData.mockReturnValue({
      leads: [sampleLeads[1]], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();
    expect(screen.getByText('Recent Note')).toBeInTheDocument();
    expect(screen.getByText('follow up needed')).toBeInTheDocument();
  });

  it('disables action buttons when phone/email is missing', () => {
    const leadNoContact = {
      ...sampleLeads[2],
      status: 'New Leads', // put in visible stage
      phone: '', email: '',
    };
    mockUseCRMData.mockReturnValue({
      leads: [leadNoContact], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();

    // Call and WA buttons should be disabled
    const callBtns = screen.getAllByTitle('Phone number not available');
    expect(callBtns.length).toBeGreaterThan(0);
    expect(callBtns[0]).toBeDisabled();
  });

  it('enables action buttons when phone is available', () => {
    mockUseCRMData.mockReturnValue({
      leads: [sampleLeads[0]], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline();

    const callBtn = screen.getByTitle('Call client');
    expect(callBtn).not.toBeDisabled();
  });

  it('handles null estimated_value in leads gracefully', () => {
    const nullValLead = { ...sampleLeads[0], estimated_value: null };
    mockUseCRMData.mockReturnValue({
      leads: [nullValLead], tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    // Should not throw
    renderPipeline();
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });

  it('picks up search from URL params', () => {
    mockUseCRMData.mockReturnValue({
      leads: sampleLeads, tasks: [], loading: false,
      refreshLeads: mockRefreshLeads, refreshTasks: mockRefreshTasks,
    });
    renderPipeline('/crm/pipeline?search=Gamma');
    expect(screen.getByText('Gamma Inc')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument();
  });
});
