import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CRMDataProvider, useCRMData } from '@/contexts/CRMDataContext';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock supabase with controllable responses
const { mockFrom, mockSubscribe, mockOn, setMockLeads, setMockTasks, setMockActivities, setMockError } = vi.hoisted(() => {
  let leadsData: any[] = [];
  let tasksData: any[] = [];
  let activitiesData: any[] = [];
  let globalError: any = null;
  
  return {
    mockFrom: vi.fn((table) => {
      const mOrder = vi.fn().mockImplementation(() => {
        if (globalError) return Promise.resolve({ data: null, error: globalError });
        if (table === 'crm_leads') return Promise.resolve({ data: leadsData, error: null });
        if (table === 'crm_tasks') return Promise.resolve({ data: tasksData, error: null });
        if (table === 'crm_activities') return Promise.resolve({ data: activitiesData, error: null });
        return Promise.resolve({ data: [], error: null });
      });
      const mEq = vi.fn().mockImplementation(() => {
        const p = mOrder();
        p.eq = mEq;
        p.order = mOrder;
        return p;
      });
      return { select: vi.fn().mockReturnValue({ eq: mEq, order: mOrder }) };
    }),
    mockSubscribe: vi.fn(),
    mockOn: vi.fn(),
    setMockLeads: (d: any[]) => leadsData = d,
    setMockTasks: (d: any[]) => tasksData = d,
    setMockActivities: (d: any[]) => activitiesData = d,
    setMockError: (err: any) => globalError = err,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({
      on: mockOn,
      subscribe: mockSubscribe,
    })),
    removeChannel: vi.fn(),
  },
}));

// Consumer component to read context values
function TestConsumer() {
  const { leads, tasks, activities, loading } = useCRMData();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="leads-count">{leads.length}</div>
      <div data-testid="tasks-count">{tasks.length}</div>
      <div data-testid="activities-count">{activities.length}</div>
    </div>
  );
}

const renderWithProvider = () => {
  return render(
    <CRMDataProvider>
      <TestConsumer />
    </CRMDataProvider>
  );
};

describe('CRMDataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockLeads([]);
    setMockTasks([]);
    setMockActivities([]);
    
    // Realtime channel mock chain
    mockSubscribe.mockReturnValue({});
    mockOn.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
  });

  it('starts in loading state', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', workspace_id: 'ws-1' },
    });
    renderWithProvider();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('fetches data when workspace_id is available', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', workspace_id: 'ws-1' },
    });

    const mockLeads = [{ id: 'l1', company_name: 'Test', status: 'New Leads' }];
    setMockLeads(mockLeads);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('leads-count').textContent).toBe('1');
  });

  it('does not fetch when workspace_id is null', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    renderWithProvider();

    // Should remain at 0 leads with no error
    await waitFor(() => {
      expect(screen.getByTestId('leads-count').textContent).toBe('0');
    });
  });

  it('sets loading to false after fetch completes', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', workspace_id: 'ws-1' },
    });

    setMockError(null);
    setMockLeads([]);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', workspace_id: 'ws-1' },
    });

    setMockError({ message: 'fetch failed' });

    // Should not throw
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('leads-count').textContent).toBe('0');
  });

  it('provides empty arrays as initial state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });
    renderWithProvider();
    expect(screen.getByTestId('leads-count').textContent).toBe('0');
    expect(screen.getByTestId('tasks-count').textContent).toBe('0');
    expect(screen.getByTestId('activities-count').textContent).toBe('0');
  });
});
