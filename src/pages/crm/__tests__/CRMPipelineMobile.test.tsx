import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
const { mockEq } = vi.hoisted(() => {
  const mEq = vi.fn();
  mEq.mockReturnValue({ eq: mEq, order: vi.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
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
      update: vi.fn().mockReturnValue({ eq: mockEq }),
      delete: vi.fn().mockReturnValue({ eq: mockEq }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'Business Strategy & Marketing Team' },
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() }, toasts: [], removeToast: vi.fn() }),
}));

vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

// Force the optimized mobile layout
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => true,
}));

const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMPipeline from '../CRMPipeline';

const leads = [
  {
    id: 'l1', company_name: 'Alpha Corp', contact_person: 'John', email: 'john@alpha.com',
    phone: '+919876543210', estimated_value: 50000, status: 'New Leads', is_pinned: false,
    service_interest: 'Web Dev', business_type: 'IT', website: 'alpha.com', external_link: '',
    notes: '', created_at: '2026-01-15T10:00:00Z', crm_tasks: [],
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
  },
  {
    id: 'l2', company_name: 'Beta LLC', contact_person: 'Jane', email: 'jane@beta.com',
    phone: '+919876543211', estimated_value: 100000, status: 'Contacted', is_pinned: true,
    service_interest: 'SEO', business_type: 'Marketing', website: '', external_link: '',
    notes: 'follow up needed', created_at: '2026-02-20T12:00:00Z', crm_tasks: [],
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
  },
  {
    id: 'l3', company_name: 'Gamma Inc', contact_person: 'Bob', email: '', phone: '',
    estimated_value: 30000, status: 'Won (Converted)', is_pinned: false,
    service_interest: '', business_type: 'Construction', website: '', external_link: '',
    notes: '', created_at: '2026-03-01T08:00:00Z', crm_tasks: [],
    assigned_to: null, assigned_user: null,
  },
];

const renderPipeline = () =>
  render(
    <MemoryRouter initialEntries={['/crm/pipeline']}>
      <CRMPipeline />
    </MemoryRouter>
  );

describe('CRMPipeline (optimized mobile layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCRMData.mockReturnValue({
      leads, tasks: [], activities: [], allLeads: leads, allTasks: [], allActivities: [],
      teamMembers: [], loading: false,
      refreshLeads: vi.fn(), refreshTasks: vi.fn(), refreshActivities: vi.fn(), refreshTeamMembers: vi.fn(),
      crmViewMode: 'team', setCrmViewMode: vi.fn(), selectedSalesRepId: 'all', setSelectedSalesRepId: vi.fn(),
    });
  });

  it('shows imported business type and service interest on the collapsed tile', () => {
    renderPipeline();
    // Alpha Corp: business_type 'IT', service_interest 'Web Dev' — both must be visible
    // without opening the card (regression: business type used to be hidden on mobile)
    expect(screen.getByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Web Dev')).toBeInTheDocument();
  });

  it('shows only the selected stage leads — one stage at a time', () => {
    renderPipeline();
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta LLC')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Inc')).not.toBeInTheDocument();
  });

  it('does not render the multi-column desktop board on mobile', () => {
    renderPipeline();
    // Desktop board would duplicate every lead; on mobile each lead appears once
    expect(screen.getAllByText('Alpha Corp').length).toBe(1);
  });

  it('renders the single-stage selector with the active stage and count', () => {
    renderPipeline();
    // Selector button shows active stage name (dropdown options are hidden until opened)
    expect(screen.getAllByText('New Leads').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Next Stage')).toBeInTheDocument();
  });

  it('opens the stage dropdown and switches stage on tap', () => {
    renderPipeline();

    fireEvent.click(screen.getAllByText('New Leads')[0]);

    // All stages listed in the dropdown
    const contactedOptions = screen.getAllByText('Contacted');
    expect(contactedOptions.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(contactedOptions[0]);

    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument();
  });

  it('shows every desktop parity action without opening a menu', () => {
    renderPipeline();
    // Contact actions
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Mail')).toBeInTheDocument();
    // Workflow actions that used to be buried on desktop-only
    expect(screen.getByText('Log Note')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('reveals management actions from the More menu', () => {
    renderPipeline();

    fireEvent.click(screen.getByText('More'));

    expect(screen.getByText('Edit Lead')).toBeInTheDocument();
    expect(screen.getByText('Move Forward')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('expands the card to reveal value, owner and stage movement', () => {
    renderPipeline();

    // Tap the card body (company name) to expand
    fireEvent.click(screen.getByText('Alpha Corp'));

    expect(screen.getAllByText('₹50,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Move Back')).toBeInTheDocument();
    expect(screen.getByText('Move Forward')).toBeInTheDocument();
  });

  it('disables contact actions when phone and email are missing', () => {
    mockUseCRMData.mockReturnValue({
      leads: [leads[2]], tasks: [], activities: [], allLeads: [leads[2]], allTasks: [], allActivities: [],
      teamMembers: [], loading: false,
      refreshLeads: vi.fn(), refreshTasks: vi.fn(), refreshActivities: vi.fn(), refreshTeamMembers: vi.fn(),
      crmViewMode: 'team', setCrmViewMode: vi.fn(), selectedSalesRepId: 'all', setSelectedSalesRepId: vi.fn(),
    });
    renderPipeline();

    // Gamma is in Won (Converted); move the selector there via Next Stage taps
    fireEvent.click(screen.getByText('Next Stage'));
    fireEvent.click(screen.getByText('Next Stage'));
    fireEvent.click(screen.getByText('Next Stage'));
    fireEvent.click(screen.getByText('Next Stage'));
    fireEvent.click(screen.getByText('Next Stage'));
    fireEvent.click(screen.getByText('Next Stage'));

    const callBtn = screen.getByText('Call').closest('button');
    const waBtn = screen.getByText('WhatsApp').closest('button');
    expect(callBtn).toBeDisabled();
    expect(waBtn).toBeDisabled();
  });
});
