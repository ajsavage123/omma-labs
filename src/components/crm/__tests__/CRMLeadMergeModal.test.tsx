import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CRMLeadMergeModal from '../CRMLeadMergeModal';

// Mock CRMDataContext
const mockUpdateLead = vi.fn();
const mockDeleteLead = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => ({
    updateLead: mockUpdateLead,
    deleteLead: mockDeleteLead,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CRMLeadMergeModal', () => {
  const mockOnClose = vi.fn();

  const mockLeadA = {
    id: 'lead-a',
    company_name: 'Stark Enterprises',
    contact_person: 'Tony Stark',
    email: 'tony@stark.com',
    phone: '111-222-3333',
    status: 'Interested',
    estimated_value: 100000,
    assigned_to: 'rep-1',
    service_interest: 'AI Solutions',
    notes: 'Initial pitch made.',
    created_at: '2026-01-01',
    assigned_user: { full_name: 'Jarvis Rep' },
  };

  const mockLeadB = {
    id: 'lead-b',
    company_name: 'Stark Corp',
    contact_person: 'Anthony Stark',
    email: 'anthony@stark.com',
    phone: '444-555-6666',
    status: 'Negotiation',
    estimated_value: 150000,
    assigned_to: 'rep-2',
    service_interest: 'Cloud Migration',
    notes: 'Requested custom pricing.',
    created_at: '2026-01-02',
    assigned_user: { full_name: 'Friday Rep' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false or leads are missing', () => {
    const { container, rerender } = render(
      <CRMLeadMergeModal isOpen={false} onClose={mockOnClose} leadA={mockLeadA} leadB={mockLeadB} />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <CRMLeadMergeModal isOpen={true} onClose={mockOnClose} leadA={null} leadB={mockLeadB} />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <CRMLeadMergeModal isOpen={true} onClose={mockOnClose} leadA={mockLeadA} leadB={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders field selector matrix comparing Lead A and Lead B', () => {
    render(
      <CRMLeadMergeModal isOpen={true} onClose={mockOnClose} leadA={mockLeadA} leadB={mockLeadB} />
    );

    expect(screen.getByText('Merge Lead Fields')).toBeInTheDocument();
    expect(screen.getByText(/Lead A: Stark Enterprises/)).toBeInTheDocument();
    expect(screen.getByText(/Lead B: Stark Corp/)).toBeInTheDocument();

    // Check displayed fields
    expect(screen.getByText('Tony Stark')).toBeInTheDocument();
    expect(screen.getByText('Anthony Stark')).toBeInTheDocument();
    expect(screen.getByText('tony@stark.com')).toBeInTheDocument();
    expect(screen.getByText('anthony@stark.com')).toBeInTheDocument();
    expect(screen.getByText('Jarvis Rep')).toBeInTheDocument();
    expect(screen.getByText('Friday Rep')).toBeInTheDocument();
  });

  it('calls onClose when clicking Cancel or the Close icon', () => {
    render(
      <CRMLeadMergeModal isOpen={true} onClose={mockOnClose} leadA={mockLeadA} leadB={mockLeadB} />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('allows selecting field from Lead B and executes merge', async () => {
    mockUpdateLead.mockResolvedValue(true);
    mockDeleteLead.mockResolvedValue(true);

    render(
      <CRMLeadMergeModal isOpen={true} onClose={mockOnClose} leadA={mockLeadA} leadB={mockLeadB} />
    );

    // Select Lead B's email: 'anthony@stark.com'
    const leadBEmailButton = screen.getByRole('button', { name: /anthony@stark\.com/i });
    fireEvent.click(leadBEmailButton);

    // Select Lead B's status: 'Negotiation'
    const leadBStatusButton = screen.getByRole('button', { name: /Negotiation.*From Lead B/i });
    fireEvent.click(leadBStatusButton);

    // Click Merge & Save
    const mergeBtn = screen.getByRole('button', { name: /merge & save lead/i });
    fireEvent.click(mergeBtn);

    await waitFor(() => {
      expect(mockUpdateLead).toHaveBeenCalledWith(
        'lead-a',
        expect.objectContaining({
          company_name: 'Stark Enterprises', // Kept from A
          email: 'anthony@stark.com', // Selected from B
          status: 'Negotiation', // Selected from B
          notes: expect.stringContaining('Merged from Duplicate Record (Stark Corp)'),
        })
      );
      expect(mockDeleteLead).toHaveBeenCalledWith('lead-b');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
