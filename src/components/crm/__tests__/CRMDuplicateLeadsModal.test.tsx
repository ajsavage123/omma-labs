import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CRMDuplicateLeadsModal from '../CRMDuplicateLeadsModal';

// Mock CRMDataContext
const mockDeleteLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CRMDuplicateLeadsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    mockUseCRMData.mockReturnValue({
      allLeads: [],
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    const { container } = render(
      <CRMDuplicateLeadsModal isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays empty state when no duplicate leads are detected', () => {
    mockUseCRMData.mockReturnValue({
      allLeads: [
        { id: '1', company_name: 'Alpha Ltd', email: 'alpha@test.com', phone: '1111111111' },
        { id: '2', company_name: 'Beta Ltd', email: 'beta@test.com', phone: '2222222222' },
      ],
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Duplicate Lead Detection')).toBeInTheDocument();
    expect(screen.getByText('No Duplicate Leads Detected')).toBeInTheDocument();
    expect(screen.getByText(/0 Groups • 0 Leads/i)).toBeInTheDocument();
  });

  it('detects and renders duplicate clusters', () => {
    const mockLeads = [
      {
        id: '1',
        company_name: 'Alpha Corp',
        contact_person: 'Alice',
        email: 'alice@alpha.com',
        phone: '1234567890',
        status: 'New Leads',
        assigned_user: { full_name: 'Sales Rep 1' },
      },
      {
        id: '2',
        company_name: 'Alpha Corp',
        contact_person: 'Alice B',
        email: 'alice@alpha.com', // Duplicate email
        phone: '9876543210',
        status: 'Proposal Sent',
        assigned_user: { full_name: 'Sales Rep 2' },
      },
    ];

    mockUseCRMData.mockReturnValue({
      allLeads: mockLeads,
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/1 Groups • 2 Leads/i)).toBeInTheDocument();
    expect(screen.getByText('Match: Exact Email')).toBeInTheDocument();
    expect(screen.getAllByText('alice@alpha.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Assigned: Sales Rep 1')).toBeInTheDocument();
    expect(screen.getByText('Assigned: Sales Rep 2')).toBeInTheDocument();
  });

  it('filters duplicate clusters by match criteria', () => {
    const mockLeads = [
      // Email duplicate group
      { id: '1', company_name: 'Acme A', email: 'same@test.com' },
      { id: '2', company_name: 'Acme B', email: 'same@test.com' },
      // Phone duplicate group
      { id: '3', company_name: 'Delta A', phone: '9999999999' },
      { id: '4', company_name: 'Delta B', phone: '9999999999' },
    ];

    mockUseCRMData.mockReturnValue({
      allLeads: mockLeads,
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    // Filter by Exact Phone
    const phoneFilterBtn = screen.getByRole('button', { name: 'Exact Phone' });
    fireEvent.click(phoneFilterBtn);

    expect(screen.getAllByText('9999999999').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('same@test.com')).not.toBeInTheDocument();
  });

  it('consolidates leads when clicking Set Master', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUpdateLead.mockResolvedValue(true);
    mockDeleteLead.mockResolvedValue(true);

    const mockLeads = [
      {
        id: 'lead-1',
        company_name: 'Target Inc',
        contact_person: 'John',
        email: 'john@target.com',
        notes: 'Original note',
      },
      {
        id: 'lead-2',
        company_name: 'Target Inc',
        contact_person: 'John duplicate',
        email: 'john@target.com',
        notes: 'Duplicate note',
      },
    ];

    mockUseCRMData.mockReturnValue({
      allLeads: mockLeads,
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    const setMasterButtons = screen.getAllByRole('button', { name: /set master/i });
    fireEvent.click(setMasterButtons[0]);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockUpdateLead).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          notes: expect.stringContaining('Merged from Duplicate'),
        })
      );
      expect(mockDeleteLead).toHaveBeenCalledWith('lead-2');
    });

    confirmSpy.mockRestore();
  });

  it('calls deleteLead when clicking individual delete button', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteLead.mockResolvedValue(true);

    const mockLeads = [
      { id: 'lead-1', company_name: 'Dup 1', email: 'dup@test.com' },
      { id: 'lead-2', company_name: 'Dup 2', email: 'dup@test.com' },
    ];

    mockUseCRMData.mockReturnValue({
      allLeads: mockLeads,
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    const deleteButtons = screen.getAllByTitle('Delete Lead');
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockDeleteLead).toHaveBeenCalledWith('lead-2');
    });

    confirmSpy.mockRestore();
  });

  it('calls onClose when close button is clicked', () => {
    mockUseCRMData.mockReturnValue({
      allLeads: [],
      deleteLead: mockDeleteLead,
      updateLead: mockUpdateLead,
    });

    render(<CRMDuplicateLeadsModal isOpen={true} onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
