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

vi.mock('@/services/googleCalendarService', () => ({
  googleCalendarService: {
    getClientId: vi.fn().mockReturnValue('test-client-id'),
    setClientId: vi.fn(),
    getLinkedAccounts: vi.fn().mockReturnValue([]),
    addAccount: vi.fn(),
    disconnectAccount: vi.fn(),
    syncTask: vi.fn(),
    generateGoogleCalendarLink: vi.fn().mockReturnValue('https://calendar.google.com/test'),
    generateGmailComposeLink: vi.fn().mockReturnValue('https://mail.google.com/test'),
  },
}));

const mockTasks = [
  {
    id: 't1', title: 'Follow up with Client', status: 'Pending',
    due_date: '2026-07-27', due_time: '10:00:00',
    assigned_to: 'user-1', crm_leads: { company_name: 'Alpha Corp' },
  },
  {
    id: 't2', title: 'Send Proposal', status: 'Completed',
    due_date: '2026-07-28', due_time: '14:00:00',
    assigned_to: 'user-1', crm_leads: { company_name: 'Beta LLC' },
  },
];

vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => ({
    tasks: mockTasks,
    loading: false,
    leads: [],
    refreshLeads: vi.fn(),
    refreshTasks: vi.fn(),
    activities: [],
    refreshActivities: vi.fn(),
  }),
}));

import CRMCalendar from '../CRMCalendar';

const renderCalendar = () => {
  return render(
    <MemoryRouter>
      <CRMCalendar />
    </MemoryRouter>
  );
};

describe('CRMCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar header and weekday labels', () => {
    renderCalendar();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText(/tasks and follow-ups/i)).toBeInTheDocument();
    // Weekday labels
    expect(screen.getAllByText('S').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('M').length).toBeGreaterThanOrEqual(1);
  });

  it('renders month navigation buttons', () => {
    renderCalendar();
    expect(screen.getByTitle('Previous month')).toBeInTheDocument();
    expect(screen.getByTitle('Next month')).toBeInTheDocument();
  });

  it('navigates to next month when clicking next', () => {
    renderCalendar();
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(currentMonth)).toBeInTheDocument();
    
    fireEvent.click(screen.getByTitle('Next month'));
    
    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(nextMonth)).toBeInTheDocument();
  });

  it('navigates to previous month when clicking prev', () => {
    renderCalendar();
    
    fireEvent.click(screen.getByTitle('Previous month'));
    
    const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    expect(screen.getByText(prevMonth)).toBeInTheDocument();
  });

  it('renders Google Calendar integration section', () => {
    renderCalendar();
    expect(screen.getByText(/Google Calendar/i)).toBeInTheDocument();
  });
});
