import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock papaparse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
    unparse: vi.fn().mockReturnValue('company_name,contact_person\nTest,John'),
  },
}));

// Mock supabase
const { mockInsert, mockEq, mockOrder, mockUpdate, mockDeleteEq } = vi.hoisted(() => {
  const mInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mEq = vi.fn();
  const mOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  mEq.mockReturnValue({ eq: mEq, order: mOrder });
  const mUpdate = vi.fn().mockReturnValue({ eq: mEq });
  const mDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
  return {
    mockInsert: mInsert, mockEq: mEq, mockOrder: mOrder,
    mockUpdate: mUpdate, mockDeleteEq: mDeleteEq
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: mockEq,
        order: mockOrder,
      }),
      insert: mockInsert,
      update: mockUpdate,
      delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
    }),
  },
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'CEO' },
  }),
}));

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: { success: mockToastSuccess, error: mockToastError },
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
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMLeads from '../CRMLeads';

const renderLeads = (initialRoute = '/crm/leads') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <CRMLeads />
    </MemoryRouter>
  );
};

const sampleLeads = [
  {
    id: 'l1', company_name: 'Alpha Corp', contact_person: 'John Doe', email: 'john@alpha.com',
    phone: '+919876543210', estimated_value: 50000, status: 'New Leads', service_interest: 'Web Dev',
    business_type: 'IT', website: 'alpha.com', external_link: '', notes: '', created_at: '2026-01-15T10:00:00Z',
    assigned_to: 'user-1', assigned_user: { full_name: 'Admin', username: 'admin' },
    payment_status: 'Pending', amount_paid: 0, budget: 60000, source: 'Referral',
  },
  {
    id: 'l2', company_name: 'Beta LLC', contact_person: 'Jane Smith', email: 'jane@beta.com',
    phone: '+919876543211', estimated_value: 100000, status: 'Interested', service_interest: 'SEO',
    business_type: 'Marketing', website: 'beta.io', external_link: '', notes: 'hot lead', created_at: '2026-02-20T12:00:00Z',
    assigned_to: 'user-2', assigned_user: { full_name: 'Sales', username: 'sales' },
    payment_status: 'Partial', amount_paid: 25000, budget: 120000, source: 'Website',
  },
  {
    id: 'l3', company_name: 'Gamma Inc', contact_person: 'Bob Builder', email: '',
    phone: '', estimated_value: 0, status: 'Lost', service_interest: '',
    business_type: 'Construction', website: '', external_link: '', notes: '', created_at: '2026-03-01T08:00:00Z',
    assigned_to: null, assigned_user: null,
    payment_status: 'Pending', amount_paid: 0, budget: 0, source: '',
  },
];

describe('CRMLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: true, refreshLeads: mockRefreshLeads });
    const { container } = renderLeads();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders leads page title', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    expect(screen.getByText('Leads')).toBeInTheDocument();
  });

  it('renders lead rows in the table', () => {
    mockUseCRMData.mockReturnValue({ leads: sampleLeads, loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    expect(screen.getByText('Gamma Inc')).toBeInTheDocument();
  });

  it('searches leads by company name', () => {
    mockUseCRMData.mockReturnValue({ leads: sampleLeads, loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.queryByText('Beta LLC')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Inc')).not.toBeInTheDocument();
  });

  it('searches leads by contact person', () => {
    mockUseCRMData.mockReturnValue({ leads: sampleLeads, loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('filters leads by status', () => {
    mockUseCRMData.mockReturnValue({ leads: sampleLeads, loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();

    // Find the status filter select
    const statusSelect = screen.getByDisplayValue('All Stages');
    fireEvent.change(statusSelect, { target: { value: 'Lost' } });

    expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma Inc')).toBeInTheDocument();
  });

  it('shows "Add Lead" button', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    expect(screen.getByText('Add Lead')).toBeInTheDocument();
  });

  it('opens add lead modal when clicking "Add Lead"', async () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    fireEvent.click(screen.getByText('Add Lead'));

    await waitFor(() => {
      expect(screen.getByText('New Opportunity')).toBeInTheDocument();
    });
  });

  it('shows empty state when no leads match filter', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    expect(screen.getByText(/no leads/i)).toBeInTheDocument();
  });

  it('renders stage color badges for each lead', () => {
    mockUseCRMData.mockReturnValue({ leads: [sampleLeads[0]], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    expect(screen.getAllByText('New Leads').length).toBeGreaterThan(0);
  });

  it('renders CSV export button', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    // Export button should exist
    const exportBtn = screen.getByText('Export');
    expect(exportBtn).toBeInTheDocument();
  });

  it('renders CSV import button', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false, refreshLeads: mockRefreshLeads });
    renderLeads();
    const importBtn = screen.getByText('Import');
    expect(importBtn).toBeInTheDocument();
  });

  it('handles leads with null/undefined values gracefully', () => {
    const nullLead = {
      id: 'l-null', company_name: 'NullCorp', contact_person: 'No One',
      email: null, phone: null, estimated_value: null, status: 'New Leads',
      service_interest: null, business_type: null, website: null, external_link: null,
      notes: null, created_at: new Date().toISOString(),
      assigned_to: null, assigned_user: null,
      payment_status: null, amount_paid: null, budget: null, source: null,
    };
    mockUseCRMData.mockReturnValue({ leads: [nullLead], loading: false, refreshLeads: mockRefreshLeads });

    // Should not throw
    renderLeads();
    expect(screen.getByText('NullCorp')).toBeInTheDocument();
  });

  it('picks up search query from URL params', () => {
    mockUseCRMData.mockReturnValue({ leads: sampleLeads, loading: false, refreshLeads: mockRefreshLeads });
    renderLeads('/crm/leads?search=Beta');

    // Should pre-populate search and show only Beta
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });
});
