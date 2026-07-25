import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CRMAccessGuard } from '../CRMAccessGuard';
import { useAuth } from '@/hooks/useAuth';
import { crmAccessService } from '@/services/crmAccessService';

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock crmAccessService
vi.mock('@/services/crmAccessService', () => ({
  crmAccessService: {
    getAccessStatus: vi.fn(),
    requestAccess: vi.fn(),
  },
}));

describe('CRMAccessGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows access automatically for admin users', () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '1',
        role: 'admin',
        designation: 'Developer & Engineering Team', // even if dev, admin role overrides
        workspace_id: 'ws-1',
      },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    expect(crmAccessService.getAccessStatus).not.toHaveBeenCalled();
  });

  it('allows access automatically for Business Strategy & Marketing Team members', () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '2',
        role: 'partner',
        designation: 'Business Strategy & Marketing Team',
        workspace_id: 'ws-1',
      },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    expect(crmAccessService.getAccessStatus).not.toHaveBeenCalled();
  });

  it('allows access automatically for Marketing & Business members', () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '2-1',
        role: 'partner',
        designation: 'Marketing & Business',
        workspace_id: 'ws-1',
      },
    });

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    expect(crmAccessService.getAccessStatus).not.toHaveBeenCalled();
  });

  it('restricts access for Developer & Engineering Team by default and queries status', async () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '3',
        role: 'partner',
        designation: 'Developer & Engineering Team',
        workspace_id: 'ws-1',
      },
    });

    (crmAccessService.getAccessStatus as any).mockResolvedValue('none');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    // Initial load will show "Verifying Access Level..."
    expect(screen.getByText('Verifying Access Level...')).toBeInTheDocument();

    // After async load finishes, it should restrict access
    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
    expect(crmAccessService.getAccessStatus).toHaveBeenCalledWith('3', 'ws-1');
  });

  it('restricts access for Innovation & Research Team by default (previously allowed)', async () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '4',
        role: 'partner',
        designation: 'Innovation & Research Team',
        workspace_id: 'ws-1',
      },
    });

    (crmAccessService.getAccessStatus as any).mockResolvedValue('none');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('crm-content')).not.toBeInTheDocument();
  });

  it('renders children if restricted user is approved in database', async () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '5',
        role: 'partner',
        designation: 'Developer & Engineering Team',
        workspace_id: 'ws-1',
      },
    });

    (crmAccessService.getAccessStatus as any).mockResolvedValue('approved');

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId('crm-content')).toBeInTheDocument();
    });

    expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
  });

  it('allows requesting access if status is none', async () => {
    (useAuth as any).mockReturnValue({
      user: {
        id: '6',
        role: 'partner',
        designation: 'Developer & Engineering Team',
        workspace_id: 'ws-1',
      },
    });

    (crmAccessService.getAccessStatus as any).mockResolvedValue('none');
    (crmAccessService.requestAccess as any).mockResolvedValue(undefined);

    render(
      <CRMAccessGuard>
        <div data-testid="crm-content">CRM Dashboard Content</div>
      </CRMAccessGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Request Access Authorization')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Request Access Authorization'));

    await waitFor(() => {
      expect(crmAccessService.requestAccess).toHaveBeenCalledWith('6', 'ws-1');
      expect(screen.getByText('AUTHORIZATION PENDING')).toBeInTheDocument();
    });
  });
});
