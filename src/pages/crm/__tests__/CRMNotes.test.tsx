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
        order: vi.fn().mockResolvedValue({ data: [], error: null })
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
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
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
const mockRefreshActivities = vi.fn();
const mockRefreshLeads = vi.fn();
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMNotes from '../CRMNotes';

const renderNotes = () => {
  return render(
    <MemoryRouter>
      <CRMNotes />
    </MemoryRouter>
  );
};

describe('CRMNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseCRMData.mockReturnValue({
      activities: [],
      leads: [],
      loading: true,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    const { container } = renderNotes();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.getByText('Loading interaction logs...')).toBeInTheDocument();
  });

  it('renders page title after loading', () => {
    mockUseCRMData.mockReturnValue({
      activities: [],
      leads: [],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();
    expect(screen.getByText('Interaction Hub')).toBeInTheDocument();
  });

  it('shows stats summary bar', () => {
    mockUseCRMData.mockReturnValue({
      activities: [],
      leads: [],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();
    expect(screen.getByText('Total Logs')).toBeInTheDocument();
    expect(screen.getByText('Phone Calls')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Positive Sentiment')).toBeInTheDocument();
  });

  it('computes stats correctly', () => {
    mockUseCRMData.mockReturnValue({
      activities: [
        { id: 'n1', lead_id: 'l1', description: '📞 CALL INTERACTION LOG\n• Discussion Points: talked about pricing\n• Client Sentiment: Very Interested\n• Agreed Next Steps: send quote', created_at: new Date().toISOString(), crm_leads: { company_name: 'A', contact_person: 'X' } },
        { id: 'n2', lead_id: 'l1', description: '🤝 MEETING INTERACTION LOG\n• Discussion Points: met in office\n• Client Sentiment: Neutral\n• Agreed Next Steps: —', created_at: new Date().toISOString(), crm_leads: { company_name: 'A', contact_person: 'X' } },
        { id: 'n3', lead_id: 'l2', description: '📧 EMAIL\n• Discussion Points: sent proposal\n• Client Sentiment: Interested\n• Agreed Next Steps: wait', created_at: new Date().toISOString(), crm_leads: { company_name: 'B', contact_person: 'Y' } },
      ],
      leads: [
        { id: 'l1', company_name: 'A', contact_person: 'X' },
        { id: 'l2', company_name: 'B', contact_person: 'Y' },
      ],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();

    expect(screen.getByText('3')).toBeInTheDocument(); // Total Logs
  });

  it('renders leads directory with note counts', () => {
    mockUseCRMData.mockReturnValue({
      activities: [
        { id: 'n1', lead_id: 'l1', description: 'call note', created_at: new Date().toISOString(), crm_leads: { company_name: 'TestCorp', contact_person: 'John' } },
        { id: 'n2', lead_id: 'l1', description: 'email note', created_at: new Date().toISOString(), crm_leads: { company_name: 'TestCorp', contact_person: 'John' } },
      ],
      leads: [{ id: 'l1', company_name: 'TestCorp', contact_person: 'John' }],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();

    expect(screen.getByText('TestCorp')).toBeInTheDocument();
    expect(screen.getAllByText('2 logs').length).toBeGreaterThan(0);
  });

  it('shows global activity feed by default', () => {
    mockUseCRMData.mockReturnValue({
      activities: [
        { id: 'n1', lead_id: 'l1', description: 'some note', created_at: new Date().toISOString(), crm_leads: { company_name: 'Alpha', contact_person: 'Bob' } },
      ],
      leads: [{ id: 'l1', company_name: 'Alpha', contact_person: 'Bob' }],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();
    expect(screen.getByText('Global Activity Timeline')).toBeInTheDocument();
  });

  it('filters notes by interaction type', () => {
    mockUseCRMData.mockReturnValue({
      activities: [
        { id: 'n1', lead_id: 'l1', description: '📞 CALL log', created_at: new Date().toISOString(), crm_leads: { company_name: 'A', contact_person: 'X' } },
        { id: 'n2', lead_id: 'l1', description: '📧 EMAIL log', created_at: new Date().toISOString(), crm_leads: { company_name: 'A', contact_person: 'X' } },
      ],
      leads: [{ id: 'l1', company_name: 'A', contact_person: 'X' }],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();

    // Click "call" filter
    const callFilter = screen.getByText('call');
    fireEvent.click(callFilter);

    // Should show call note only
    expect(screen.getByText('Call Interaction')).toBeInTheDocument();
  });

  it('shows empty state when no notes', () => {
    mockUseCRMData.mockReturnValue({
      activities: [],
      leads: [],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();
    expect(screen.getByText('No logs recorded')).toBeInTheDocument();
  });

  it('opens log interaction modal', async () => {
    mockUseCRMData.mockReturnValue({
      activities: [],
      leads: [{ id: 'l1', company_name: 'TestLead', contact_person: 'Jane' }],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();

    fireEvent.click(screen.getByText('Log Interaction'));

    await waitFor(() => {
      expect(screen.getByText('Log Client Interaction')).toBeInTheDocument();
    });
  });

  it('parses structured notes correctly', () => {
    const structuredNote = `📞 CALL INTERACTION LOG
• Discussion Points: Discussed pricing and timeline
• Client Sentiment: Very Interested
• Agreed Next Steps: Send proposal by Friday
• Additional Details: Budget approved internally`;

    mockUseCRMData.mockReturnValue({
      activities: [
        { id: 'n1', lead_id: 'l1', description: structuredNote, created_at: new Date().toISOString(), crm_leads: { company_name: 'StructCorp', contact_person: 'Test' } },
      ],
      leads: [{ id: 'l1', company_name: 'StructCorp', contact_person: 'Test' }],
      loading: false,
      refreshActivities: mockRefreshActivities,
      refreshLeads: mockRefreshLeads,
    });
    renderNotes();

    expect(screen.getByText('Call Interaction')).toBeInTheDocument();
    expect(screen.getByText(/Discussed pricing and timeline/)).toBeInTheDocument();
  });
});
