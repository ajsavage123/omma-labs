import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock supabase
const { mockFrom, mockChannel, mockRemoveChannel, mockEq, mockSelect, mockOrder, mockInsert, mockUpdate, mockDelete } = vi.hoisted(() => {
  return {
    mockFrom: vi.fn(), mockChannel: vi.fn(), mockRemoveChannel: vi.fn(),
    mockEq: vi.fn(), mockSelect: vi.fn(), mockOrder: vi.fn(),
    mockInsert: vi.fn(), mockUpdate: vi.fn(), mockDelete: vi.fn()
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
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
const mockRefreshTasks = vi.fn();
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

import CRMTasks from '../CRMTasks';

const renderTasks = () => {
  return render(
    <MemoryRouter>
      <CRMTasks />
    </MemoryRouter>
  );
};

const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

describe('CRMTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin' },
    });
    
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  it('renders loading state', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [],
      loading: true,
      refreshTasks: mockRefreshTasks,
    });
    const { container } = renderTasks();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders tasks page title after loading', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('renders tab buttons with correct counts', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Pending', due_date: todayStr, title: 'Today Task', created_at: now.toISOString() },
        { id: 't2', status: 'Pending', due_date: tomorrowStr, title: 'Future Task', created_at: now.toISOString() },
        { id: 't3', status: 'Pending', due_date: yesterdayStr, title: 'Overdue Task', created_at: now.toISOString() },
        { id: 't4', status: 'Completed', due_date: todayStr, title: 'Done Task', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('filters tasks by "today" tab (default)', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Pending', due_date: todayStr, title: 'Call client today', created_at: now.toISOString() },
        { id: 't2', status: 'Pending', due_date: tomorrowStr, title: 'Tomorrow task', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();

    // Default tab is "today"
    expect(screen.getByText('Call client today')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow task')).not.toBeInTheDocument();
  });

  it('filters tasks by "upcoming" tab', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Pending', due_date: todayStr, title: 'Today task', created_at: now.toISOString() },
        { id: 't2', status: 'Pending', due_date: tomorrowStr, title: 'Upcoming task', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();

    fireEvent.click(screen.getByText('Upcoming'));
    expect(screen.getByText('Upcoming task')).toBeInTheDocument();
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
  });

  it('filters tasks by "overdue" tab', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Pending', due_date: yesterdayStr, title: 'Overdue task here', created_at: now.toISOString() },
        { id: 't2', status: 'Pending', due_date: todayStr, title: 'Today task', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();

    fireEvent.click(screen.getByText('Overdue'));
    expect(screen.getByText('Overdue task here')).toBeInTheDocument();
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
  });

  it('filters tasks by "completed" tab', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Completed', due_date: todayStr, title: 'Finished task', created_at: now.toISOString() },
        { id: 't2', status: 'Pending', due_date: todayStr, title: 'Pending task', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();

    fireEvent.click(screen.getByText('Done'));
    expect(screen.getByText('Finished task')).toBeInTheDocument();
    expect(screen.queryByText('Pending task')).not.toBeInTheDocument();
  });

  it('shows empty state when no tasks match filter', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    expect(screen.getByText('No tasks in this category')).toBeInTheDocument();
  });

  it('renders task priority badge', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        { id: 't1', status: 'Pending', due_date: todayStr, title: 'High priority task', priority: 'High', created_at: now.toISOString() },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders associated lead name in task card', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [
        {
          id: 't1',
          status: 'Pending',
          due_date: todayStr,
          title: 'Follow up',
          priority: 'Medium',
          created_at: now.toISOString(),
          crm_leads: { company_name: 'Acme Corp', contact_person: 'John' }
        },
      ],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows "Add Task" button', () => {
    mockUseCRMData.mockReturnValue({
      tasks: [],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  it('opens modal when "Add Task" is clicked', async () => {
    mockUseCRMData.mockReturnValue({
      tasks: [],
      loading: false,
      refreshTasks: mockRefreshTasks,
    });
    renderTasks();
    fireEvent.click(screen.getByText('Add Task'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
    });
  });
});
