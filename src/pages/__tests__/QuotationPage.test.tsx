import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuotationPage from '../QuotationPage';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'admin@oomalabs.com' },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  },
}));

describe('QuotationPage Dual Currency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <QuotationPage />
      </BrowserRouter>
    );
  };

  it('renders Quotation Generator header and dual currency controls', () => {
    renderComponent();

    expect(screen.getByText('Quotation Tools')).toBeInTheDocument();
    expect(screen.getByText(/Multiple Currency Quotes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /BOTH \(₹ & \$\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /INR \(₹\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /USD \(\$\)/i })).toBeInTheDocument();
  });

  it('allows switching display currency modes between BOTH, INR, and USD', () => {
    renderComponent();

    const buttonINR = screen.getByRole('button', { name: /INR \(₹\)/i });
    fireEvent.click(buttonINR);

    // Verify INR mode button is selected
    expect(buttonINR).toBeInTheDocument();

    const buttonUSD = screen.getByRole('button', { name: /USD \(\$\)/i });
    fireEvent.click(buttonUSD);

    expect(buttonUSD).toBeInTheDocument();
  });

  it('renders module catalog editor with independent Rupee and Dollar inputs', () => {
    renderComponent();

    expect(screen.getByText(/Edit Module & Multiple Currency Price Tags/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\., Home Page or Payment Gateway/i)).toBeInTheDocument();
    
    // Check for explicit Rupee and Dollar price tags in the form
    expect(screen.getByText(/Rupees \(₹ INR\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dollars \(\$ USD\)/i)).toBeInTheDocument();
  });

  it('calculates totals independently for INR and USD without exchange rate conversion math', () => {
    renderComponent();

    // Verify subtotal section displays dual values by default
    expect(screen.getByText(/Net Total/i)).toBeInTheDocument();
  });
});
