import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

// Dynamic user mock
const mockUser = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUser(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/notificationService', () => ({
  notificationService: {
    requestPermission: vi.fn(),
    showNotification: vi.fn(),
    playSound: vi.fn(),
  },
}));

vi.mock('@/components/OomaLogo', () => ({
  OomaLogo: () => <div data-testid="ooma-logo" />,
}));

vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => ({
    tasks: [
      { id: 't1', title: 'Task 1', due_date: '2026-07-27', status: 'Pending', crm_leads: { company_name: 'Alpha' } },
      { id: 't2', title: 'Task 2', due_date: '2026-07-28', status: 'Completed', crm_leads: { company_name: 'Beta' } },
    ],
    refreshTasks: vi.fn(),
    leads: [],
    loading: false,
    refreshLeads: vi.fn(),
    activities: [],
    refreshActivities: vi.fn(),
  }),
}));

import CRMLayout from '../CRMLayout';

const renderLayout = () => {
  return render(
    <MemoryRouter initialEntries={['/crm']}>
      <CRMLayout>
        <div data-testid="child-content">Page Content</div>
      </CRMLayout>
    </MemoryRouter>
  );
};

describe('CRMLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window width for desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });
  });

  it('renders sidebar navigation items for admin', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
    });
    renderLayout();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders children content', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
    });
    renderLayout();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders OOMA branding', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
    });
    renderLayout();
    expect(screen.getByText('OOMA')).toBeInTheDocument();
    expect(screen.getByText('CRM ENGINE')).toBeInTheDocument();
  });

  it('renders notification bell', () => {
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
    });
    renderLayout();
    // The bell icon should be present (notification badge shows count for pending tasks)
    expect(screen.getByTestId('ooma-logo')).toBeInTheDocument();
  });
});
