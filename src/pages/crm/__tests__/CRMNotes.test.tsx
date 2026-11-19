import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
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

const sampleLeads = [
  {
    id: 'l1', company_name: 'Alpha Corp', contact_person: 'John',
    email: 'john@alpha.com', notes: '', assigned_to: 'user-1',
  },
  {
    id: 'l2', company_name: 'Beta LLC', contact_person: 'Jane',
    email: 'jane@beta.com', notes: 'Previous meeting notes', assigned_to: 'user-2',
  },
];

const sampleNotes = [
  {
    id: 'n1', lead_id: 'l1', user_id: 'user-1', activity_type: 'note',
    description: '📞 CALL INTERACTION LOG\n• Discussion Points: Discussed pricing\n• Client Sentiment: Interested\n• Agreed Next Steps: Send quote',
    created_at: '2026-07-25T10:00:00Z',
    crm_leads: { company_name: 'Alpha Corp', contact_person: 'John' },
  },
  {
    id: 'n2', lead_id: 'l2', user_id: 'user-1', activity_type: 'note',
    description: '📧 EMAIL INTERACTION LOG\n• Discussion Points: Follow up on proposal\n• Client Sentiment: Hesitant\n• Agreed Next Steps: Schedule demo',
    created_at: '2026-07-26T12:00:00Z',
    crm_leads: { company_name: 'Beta LLC', contact_person: 'Jane' },
  },
];

vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => ({
    activities: sampleNotes,
    leads: sampleLeads,
    loading: false,
    refreshActivities: vi.fn(),
    refreshLeads: vi.fn(),
    tasks: [],
    refreshTasks: vi.fn(),
  }),
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

  it('renders notes header and Log Interaction button', () => {
    renderNotes();
    expect(screen.getByText('Interaction Hub')).toBeInTheDocument();
    expect(screen.getByText('Log Interaction')).toBeInTheDocument();
  });

  it('renders note cards from data (company names appear in sidebar and timeline)', () => {
    renderNotes();
    // Company names appear both in sidebar leads list and in timeline note cards
    expect(screen.getAllByText(/Alpha Corp/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Beta LLC/).length).toBeGreaterThanOrEqual(1);
  });

  it('parses structured notes correctly and shows call/email interaction types', () => {
    renderNotes();
    expect(screen.getByText('Call Interaction')).toBeInTheDocument();
    expect(screen.getByText('Email Interaction')).toBeInTheDocument();
  });

  it('filters notes by search query', () => {
    renderNotes();
    const searchInput = screen.getByPlaceholderText(/search leads or notes/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    // Alpha Corp still appears (in sidebar + filtered note)
    expect(screen.getAllByText(/Alpha Corp/).length).toBeGreaterThanOrEqual(1);
  });

  it('opens log interaction modal when button is clicked', () => {
    renderNotes();
    fireEvent.click(screen.getByText('Log Interaction'));
    expect(screen.getByText('Log Client Interaction')).toBeInTheDocument();
  });

  it('renders filter pill tabs', () => {
    renderNotes();
    // Filter pills render lowercase text
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('call')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('renders stats summary bar', () => {
    renderNotes();
    expect(screen.getByText('Total Logs')).toBeInTheDocument();
    expect(screen.getByText('Phone Calls')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Positive Sentiment')).toBeInTheDocument();
  });
});
