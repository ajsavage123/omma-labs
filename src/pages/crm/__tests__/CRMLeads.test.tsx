import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
      update: vi.fn().mockReturnValue({ eq: mockEq }),
      delete: vi.fn().mockReturnValue({ eq: mockEq }),
    }),
  },
}));

// Default: admin user
const mockUser = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUser(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

vi.mock('@/hooks/useWorkspaceUsers', () => ({
  useWorkspaceUsers: () => ({
    users: [
      { id: 'user-1', full_name: 'Admin User', username: 'admin' },
      { id: 'user-2', full_name: 'Sales Person', username: 'sales1' },
    ],
  }),
}));

const mockRefreshLeads = vi.fn();
const mockRefreshActivities = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => ({
    leads: sampleLeads,
    loading: false,
    refreshLeads: mockRefreshLeads,
    activities: [],
    refreshActivities: mockRefreshActivities,
    tasks: [],
    refreshTasks: vi.fn(),
  }),
}));

import CRMLeads from '../CRMLeads';

const sampleLeads = [
  {
    id: 'l1', company_name: 'Alpha Corp', contact_person: 'John', email: 'john@alpha.com',
    phone: '+919876543210', estimated_value: 50000, status: 'New Leads', is_pinned: false,
    service_interest: 'Web Dev', business_type: 'IT', website: 'alpha.com', external_link: '',
    notes: '', created_at: '2026-01-15T10:00:00Z', crm_tasks: [], budget: 0,
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
    source: 'Manual', payment_status: 'Pending', amount_paid: 0, custom_data: {},
  },
  {
    id: 'l2', company_name: 'Beta LLC', contact_person: 'Jane', email: 'jane@beta.com',
    phone: '+919876543211', estimated_value: 100000, status: 'Interested', is_pinned: true,
    service_interest: 'SEO', business_type: 'Marketing', website: '', external_link: '',
    notes: '', created_at: '2026-01-20T10:00:00Z', crm_tasks: [], budget: 0,
    assigned_to: 'user-2', assigned_user: { full_name: 'Sales Person', username: 'sales1' },
    source: 'Referral', payment_status: 'Paid', amount_paid: 5000, custom_data: {},
  },
];

const renderLeads = (route = '/crm/leads') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CRMLeads />
    </MemoryRouter>
  );
};

describe('CRMLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'Business Strategy & Marketing Team' },
    });
  });

  it('renders leads header and Add Lead button', () => {
    renderLeads();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Add Lead')).toBeInTheDocument();
  });

  it('renders lead rows from data', () => {
    renderLeads();
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('shows Delete Leads button for admin users', () => {
    renderLeads();
    expect(screen.getByText('Delete Leads')).toBeInTheDocument();
  });

  it('shows Delete Leads button for partner (non-admin) users', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-2', workspace_id: 'ws-1', role: 'partner', designation: 'Business Strategy & Marketing Team' },
    });
    renderLeads();
    expect(screen.getByText('Delete Leads')).toBeInTheDocument();
  });

  it('does not render duplicate local Owner filter in page body', () => {
    renderLeads();
    expect(screen.queryByText('Owner:')).not.toBeInTheDocument();
  });

  it('shows My Leads badge for salesperson users', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-2', workspace_id: 'ws-1', role: 'partner', designation: 'Business Strategy & Marketing Team' },
    });
    renderLeads();
    expect(screen.getByText('My Leads')).toBeInTheDocument();
  });

  it('filters leads by search query', () => {
    renderLeads();
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta LLC')).not.toBeInTheDocument();
  });

  it('opens add lead modal when clicking Add Lead', () => {
    renderLeads();
    fireEvent.click(screen.getByText('Add Lead'));
    expect(screen.getByText('New Opportunity')).toBeInTheDocument();
  });
});
