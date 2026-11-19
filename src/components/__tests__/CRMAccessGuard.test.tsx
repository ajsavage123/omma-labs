import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// Dynamic user mock
const mockUser = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUser(),
}));

// Mock crmAccessService
const mockGetAccessStatus = vi.fn();
const mockRequestAccess = vi.fn();
vi.mock('@/services/crmAccessService', () => ({
  crmAccessService: {
    getAccessStatus: (...args: any[]) => mockGetAccessStatus(...args),
    requestAccess: (...args: any[]) => mockRequestAccess(...args),
  },
}));

import { CRMAccessGuard } from '../CRMAccessGuard';

describe('CRMAccessGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants immediate access to admin users', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-1', workspace_id: 'ws-1', role: 'admin', designation: 'Engineering' },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    });
  });

  it('grants immediate access to Business Strategy & Marketing Team members', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-2', workspace_id: 'ws-1', role: 'partner', designation: 'Business Strategy & Marketing Team' },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    });
  });

  it('blocks access and shows restricted message for non-authorized users with no request', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-3', workspace_id: 'ws-1', role: 'partner', designation: 'Research & Development' },
    });
    mockGetAccessStatus.mockResolvedValue('none');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });
    expect(screen.getByText('Request Access Authorization')).toBeInTheDocument();
    expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
  });

  it('shows pending status when access has been requested', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-3', workspace_id: 'ws-1', role: 'partner', designation: 'Research & Development' },
    });
    mockGetAccessStatus.mockResolvedValue('pending');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('AUTHORIZATION PENDING')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
  });

  it('shows denied status when access request was rejected', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-3', workspace_id: 'ws-1', role: 'partner', designation: 'Research & Development' },
    });
    mockGetAccessStatus.mockResolvedValue('rejected');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('ACCESS DENIED BY ADMIN')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
  });

  it('submits access request when clicking the button', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-3', workspace_id: 'ws-1', role: 'partner', designation: 'Research & Development' },
    });
    mockGetAccessStatus.mockResolvedValue('none');
    mockRequestAccess.mockResolvedValue(undefined);

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Request Access Authorization')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Access Authorization'));

    await waitFor(() => {
      expect(mockRequestAccess).toHaveBeenCalledWith('user-3', 'ws-1');
    });

    await waitFor(() => {
      expect(screen.getByText('AUTHORIZATION PENDING')).toBeInTheDocument();
    });
  });

  it('grants access to Marketing & Business designated users', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-4', workspace_id: 'ws-1', role: 'partner', designation: 'Marketing & Business' },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    });
  });

  it('shows Return to Dashboard link', async () => {
    mockUser.mockReturnValue({
      user: { id: 'user-3', workspace_id: 'ws-1', role: 'partner', designation: 'Engineering' },
    });
    mockGetAccessStatus.mockResolvedValue('none');

    render(
      <CRMAccessGuard>
        <div>CRM Content</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
    });
  });
});
