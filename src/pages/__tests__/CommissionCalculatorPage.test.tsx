import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommissionCalculatorPage from '../CommissionCalculatorPage';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CommissionCalculatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <CommissionCalculatorPage />
      </BrowserRouter>
    );
  };

  it('renders header, tabs, and default input state', () => {
    renderComponent();

    expect(screen.getByText(/Commission Calculator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Commission Slabs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Multi-Project/i })).toBeInTheDocument();

    const devPctInput = screen.getByDisplayValue('30') as HTMLInputElement;
    expect(devPctInput).toBeInTheDocument();

    const projectValInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(projectValInput.value).toBe('');
  });

  it('calculates payouts correctly when project value is entered', () => {
    renderComponent();

    const projectValInput = screen.getByPlaceholderText('0');
    fireEvent.change(projectValInput, { target: { value: '60000' } });

    // 60,000 falls in slab: ₹56,000 - ₹65,000 @ 15%
    expect(screen.getByText(/Active slab: ₹56,000 - ₹65,000 @ 15%/i)).toBeInTheDocument();

    // Sales Commission = 15% of 60,000 = 9,000
    // Developer Payout = 30% of 60,000 = 18,000
    // Company Revenue = 55% of 60,000 = 33,000
    expect(screen.getAllByText('₹18,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹9,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹33,000').length).toBeGreaterThan(0);
  });

  it('allows updating developer percentage', () => {
    renderComponent();

    const devPctInput = screen.getByDisplayValue('30');
    fireEvent.change(devPctInput, { target: { value: '40' } });

    expect(screen.getByDisplayValue('40')).toBeInTheDocument();
  });

  it('switches to Commission Slabs tab and renders slabs manager', () => {
    renderComponent();

    const slabsTab = screen.getByRole('button', { name: /Commission Slabs/i });
    fireEvent.click(slabsTab);

    expect(screen.getByText(/Commission Slabs Manager/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Slab/i })).toBeInTheDocument();
  });

  it('switches to Multi-Project tab and calculates forecast', () => {
    renderComponent();

    // Enter project value first
    const projectValInput = screen.getByPlaceholderText('0');
    fireEvent.change(projectValInput, { target: { value: '100000' } });

    const multiTab = screen.getByRole('button', { name: /Multi-Project/i });
    fireEvent.click(multiTab);

    expect(screen.getByText(/Multi-Project Forecast Configuration/i)).toBeInTheDocument();

    const numProjectsInput = screen.getByDisplayValue('5');
    expect(numProjectsInput).toBeInTheDocument();
  });
});
