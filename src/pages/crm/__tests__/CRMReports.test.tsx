import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Mock CRMDataContext
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

import CRMReports from '../CRMReports';

const renderReports = () => {
  return render(
    <MemoryRouter>
      <CRMReports />
    </MemoryRouter>
  );
};

describe('CRMReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } });
  });

  it('returns null during loading', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: true });
    const { container } = renderReports();
    expect(container.innerHTML).toBe('');
  });

  it('renders reports page title', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false });
    renderReports();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('computes conversion rate correctly', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Won (Converted)', estimated_value: 10000 },
        { id: '2', status: 'Completed', estimated_value: 5000 },
        { id: '3', status: 'New Leads', estimated_value: 20000 },
        { id: '4', status: 'Lost', estimated_value: 15000 },
      ],
      loading: false,
    });
    renderReports();
    // Won + Completed = 2, total = 4 → 50.0%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('computes average deal size from won leads only', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Won (Converted)', estimated_value: 10000 },
        { id: '2', status: 'Completed', estimated_value: 20000 },
        { id: '3', status: 'New Leads', estimated_value: 100000 }, // excluded
      ],
      loading: false,
    });
    renderReports();
    // Avg = (10000 + 20000) / 2 = 15000
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
  });

  it('shows zero conversion rate when no leads', () => {
    mockUseCRMData.mockReturnValue({ leads: [], loading: false });
    renderReports();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    const zeroAmounts = screen.getAllByText('₹0');
    expect(zeroAmounts.length).toBeGreaterThan(0);
  });

  it('counts lost deals correctly', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Lost', estimated_value: 5000 },
        { id: '2', status: 'Lost', estimated_value: 10000 },
        { id: '3', status: 'New Leads', estimated_value: 1000 },
      ],
      loading: false,
    });
    renderReports();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 lost
    expect(screen.getByText('Total ₹15,000')).toBeInTheDocument();
  });

  it('renders stage distribution section', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'New Leads', estimated_value: 5000 },
        { id: '2', status: 'Contacted', estimated_value: 3000 },
      ],
      loading: false,
    });
    renderReports();
    expect(screen.getByText('Stage Distribution')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Summary')).toBeInTheDocument();
  });

  it('computes total pipeline value excluding lost and not interested', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'New Leads', estimated_value: 10000 },
        { id: '2', status: 'Lost', estimated_value: 50000 },         // excluded
        { id: '3', status: 'Not Interested', estimated_value: 5000 }, // excluded
        { id: '4', status: 'Interested', estimated_value: 20000 },
      ],
      loading: false,
    });
    renderReports();
    // Total pipeline = 10000 + 20000 = 30000
    expect(screen.getByText('₹30,000')).toBeInTheDocument();
  });

  it('handles null estimated_value gracefully', () => {
    mockUseCRMData.mockReturnValue({
      leads: [
        { id: '1', status: 'Won (Converted)', estimated_value: null },
        { id: '2', status: 'Won (Converted)', estimated_value: 10000 },
      ],
      loading: false,
    });
    // Should not throw
    renderReports();
  });
});
