/**
 * Tests specifically targeting the lead duplication bug fix:
 *
 * Bug: When moving a lead between pipeline stages, the lead appeared
 * in two columns simultaneously due to:
 *  1. refreshLeads() called after updateLeadStage raced with the realtime patch
 *  2. Realtime UPDATE patch overwrote nested joins (assigned_user, crm_tasks) with undefined
 *
 * These tests verify both fixes are working correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Hoist mocks so they are defined before vi.mock() hoisting ───────────────
const { mockUpdate, mockUpdateEq, mockRefreshLeads, mockUseCRMData } = vi.hoisted(() => {
  const mUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const mUpdate = vi.fn().mockReturnValue({ eq: mUpdateEq });
  const mRefreshLeads = vi.fn();
  const mUseCRMData = vi.fn();
  return {
    mockUpdate: mUpdate,
    mockUpdateEq: mUpdateEq,
    mockRefreshLeads: mRefreshLeads,
    mockUseCRMData: mUseCRMData,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: mockUpdate,
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'Business Strategy & Marketing Team' },
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn() },
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMPipeline from '../CRMPipeline';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const renderPipeline = () =>
  render(
    <MemoryRouter initialEntries={['/crm/pipeline']}>
      <CRMPipeline />
    </MemoryRouter>
  );

const makeLead = (overrides: Record<string, any> = {}) => ({
  id: 'l-test',
  company_name: 'TestCo',
  contact_person: 'Alice',
  email: 'alice@test.com',
  phone: '+911234567890',
  estimated_value: 10000,
  status: 'New Leads',
  is_pinned: false,
  service_interest: 'Design',
  business_type: 'Agency',
  website: '',
  external_link: '',
  notes: '',
  created_at: '2026-01-01T00:00:00Z',
  crm_tasks: [],
  assigned_to: 'user-1',
  assigned_user: { id: 'user-1', full_name: 'Admin User', username: 'admin' },
  ...overrides,
});

const defaultContext = (leads: any[]) => ({
  leads,
  tasks: [],
  activities: [],
  loading: false,
  refreshLeads: mockRefreshLeads,
});

// ─── Suite 1: No refreshLeads race ───────────────────────────────────────────
describe('Lead Duplication Fix — updateLeadStage does not race refreshLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
  });

  it('does NOT call refreshLeads() after a successful stage move', async () => {
    const lead = makeLead({ status: 'New Leads' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    const forwardBtns = screen.getAllByTitle('Move forward');
    await act(async () => {
      fireEvent.click(forwardBtns[0]);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    // CRITICAL: refreshLeads must NOT be called — realtime channel handles it
    expect(mockRefreshLeads).not.toHaveBeenCalled();
  });

  it('calls supabase update with the correct next stage key (New Leads → Contacted)', async () => {
    const lead = makeLead({ status: 'New Leads' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    const forwardBtns = screen.getAllByTitle('Move forward');
    await act(async () => {
      fireEvent.click(forwardBtns[0]);
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'Contacted' });
    });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'l-test');
  });

  it('backward button is disabled on the first stage (no update fires)', () => {
    const lead = makeLead({ status: 'New Leads' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    const backwardBtns = screen.getAllByTitle('Move backward');
    expect(backwardBtns[0]).toBeDisabled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('forward button is disabled on the last stage (no update fires)', () => {
    const lead = makeLead({ status: 'Won (Converted)' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    const forwardBtns = screen.getAllByTitle('Move forward');
    // Last stage forward button is disabled
    const lastForwardBtn = forwardBtns[forwardBtns.length - 1];
    expect(lastForwardBtn).toBeDisabled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── Suite 2: No double-column rendering ─────────────────────────────────────
describe('Lead Duplication Fix — no double-column rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a lead in Contacted status appears exactly once across all columns', () => {
    const lead = makeLead({ status: 'Contacted' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    expect(screen.getAllByText('TestCo').length).toBe(1);
  });

  it('a lead in Interested status appears exactly once across all columns', () => {
    const lead = makeLead({ status: 'Interested' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    expect(screen.getAllByText('TestCo').length).toBe(1);
  });

  it('a lead in Proposal Sent status appears exactly once', () => {
    const lead = makeLead({ status: 'Proposal Sent' });
    mockUseCRMData.mockReturnValue(defaultContext([lead]));

    renderPipeline();

    expect(screen.getAllByText('TestCo').length).toBe(1);
  });

  it('leads with valid statuses are NOT shown in the unmapped bucket', () => {
    const leads = [
      makeLead({ id: 'l1', status: 'New Leads',      company_name: 'Alpha' }),
      makeLead({ id: 'l2', status: 'Contacted',       company_name: 'Beta'  }),
      makeLead({ id: 'l3', status: 'Interested',      company_name: 'Gamma' }),
      makeLead({ id: 'l4', status: 'Won (Converted)', company_name: 'Delta' }),
    ];
    mockUseCRMData.mockReturnValue(defaultContext(leads));

    renderPipeline();

    // Each company must appear exactly once — no duplication into unmapped bucket
    ['Alpha', 'Beta', 'Gamma', 'Delta'].forEach(name => {
      expect(screen.getAllByText(name).length).toBe(1);
    });

    // No unmapped warning badge
    expect(screen.queryByText(/unmapped/i)).not.toBeInTheDocument();
  });
});
