import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

// Mock CRMDataContext
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

// Import after mocks
import CRMDashboard from '../CRMDashboard';

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <CRMDashboard />
    </MemoryRouter>
  );
};

describe('CRMDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when data is loading', () => {
    mockUseCRMData.mockReturnValue({ leads: [], tasks: [], loading: true });
    const { container } = renderDashboard();
    // Should show spinner, not dashboard content
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Sales Dashboard')).not.toBeInTheDocument();
  });

  it('renders dashboard title after loading', () => {
    mockUseCRMData.mockReturnValue({ leads: [], tasks: [], loading: false });
    renderDashboard();
    expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
  });

  it('computes pipeline value from active leads only', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'New Leads', estimated_value: 10000, created_at: new Date().toISOString(), company_name: 'A' },
        { id: '2', status: 'Interested', estimated_value: 20000, created_at: new Date().toISOString(), company_name: 'B' },
        { id: '3', status: 'Lost', estimated_value: 50000, created_at: new Date().toISOString(), company_name: 'C' }, // excluded
        { id: '4', status: 'Not Interested', estimated_value: 5000, created_at: new Date().toISOString(), company_name: 'D' }, // excluded
      ],
      tasks: [],
      loading: false,
    });
    renderDashboard();
    // Pipeline value = 10000 + 20000 = 30000 (Lost and Not Interested excluded)
    expect(screen.getByText('₹30,000')).toBeInTheDocument();
  });

  it('computes closed won value from won + completed leads', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Won (Converted)', estimated_value: 15000, created_at: new Date().toISOString(), company_name: 'W' },
        { id: '2', status: 'Completed', estimated_value: 25000, created_at: new Date().toISOString(), company_name: 'X' },
        { id: '3', status: 'New Leads', estimated_value: 100000, created_at: new Date().toISOString(), company_name: 'Y' },
      ],
      tasks: [],
      loading: false,
    });
    renderDashboard();
    expect(screen.getByText('₹40,000')).toBeInTheDocument(); // 15000 + 25000
  });

  it('shows zero counts when no leads or tasks', () => {
    mockUseCRMData.mockReturnValue({ leads: [], tasks: [], loading: false });
    renderDashboard();
    // Pipeline Value = ₹0, Closed Won = ₹0, Due Today = 0, Overdue = 0
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });

  it('counts overdue tasks (due before today, not completed)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    mockUseCRMData.mockReturnValue({
      leads: [],
      tasks: [
        { id: 't1', status: 'Pending', due_date: yesterday.toISOString(), title: 'Overdue task' },
        { id: 't2', status: 'Completed', due_date: yesterday.toISOString(), title: 'Done task' }, // excluded
      ],
      loading: false,
    });
    renderDashboard();
    // 1 overdue task visible
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('counts tasks due today', () => {
    const today = new Date();

    mockUseCRMData.mockReturnValue({
      leads: [],
      tasks: [
        { id: 't1', status: 'Pending', due_date: today.toISOString(), title: 'Today task 1' },
        { id: 't2', status: 'Pending', due_date: today.toISOString(), title: 'Today task 2' },
      ],
      loading: false,
    });
    renderDashboard();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
  });

  it('renders pipeline stage data for charts', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'New Leads', estimated_value: 5000, created_at: new Date().toISOString(), company_name: 'A' },
        { id: '2', status: 'New Leads', estimated_value: 3000, created_at: new Date().toISOString(), company_name: 'B' },
        { id: '3', status: 'Won (Converted)', estimated_value: 10000, created_at: new Date().toISOString(), company_name: 'C' },
      ],
      tasks: [],
      loading: false,
    });
    renderDashboard();
    // Charts should render
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    // Stage legend should show counts
    expect(screen.getAllByText('New Leads').length).toBeGreaterThan(0);
  });

  it('renders recent updates section with leads', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Interested', estimated_value: 5000, created_at: new Date().toISOString(), company_name: 'TestCorp' },
      ],
      tasks: [],
      loading: false,
    });
    renderDashboard();
    expect(screen.getByText('TestCorp')).toBeInTheDocument();
    expect(screen.getByText('Recent Updates')).toBeInTheDocument();
  });

  it('handles leads with null estimated_value gracefully', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'New Leads', estimated_value: null, created_at: new Date().toISOString(), company_name: 'NullVal' },
        { id: '2', status: 'New Leads', estimated_value: undefined, created_at: new Date().toISOString(), company_name: 'UndefVal' },
      ],
      tasks: [],
      loading: false,
    });
    // Should not throw
    renderDashboard();
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });
});
