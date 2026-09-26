import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CRMSettings from '../CRMSettings';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock pushNotificationService
vi.mock('@/services/pushNotificationService', () => ({
  pushNotificationService: {
    subscribeToPushNotifications: vi.fn(),
  },
}));

// Mock notificationService
vi.mock('@/utils/notificationService', () => ({
  notificationService: {
    showNotification: vi.fn(),
  },
}));

import { pushNotificationService } from '@/services/pushNotificationService';
import { notificationService } from '@/utils/notificationService';

describe('CRMSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        full_name: 'John Doe',
        role: 'Admin',
        workspace_id: 'ws-12345',
      },
      supabaseUser: {
        email: 'john@example.com',
      },
    });
  });

  it('renders settings header, account information, and workspace details', () => {
    render(<CRMSettings />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Workspace and account configuration')).toBeInTheDocument();

    // Account
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials avatar
    expect(screen.getByText('Admin')).toBeInTheDocument();

    // Workspace
    expect(screen.getByText('Workspace ID')).toBeInTheDocument();
    expect(screen.getByText('ws-12345')).toBeInTheDocument();
  });

  it('renders fallback values when user details are missing', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      supabaseUser: null,
    });

    render(<CRMSettings />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('OA')).toBeInTheDocument(); // Default initials
    expect(screen.getByText('Member')).toBeInTheDocument(); // Default role
    expect(screen.getByText('—')).toBeInTheDocument(); // Empty workspace ID
  });

  it('renders CRM configuration options', () => {
    render(<CRMSettings />);

    expect(screen.getByText('Auto-task on stage change')).toBeInTheDocument();
    expect(screen.getByText('Overdue task alerts')).toBeInTheDocument();
    expect(screen.getByText('CSV bulk import')).toBeInTheDocument();
    expect(screen.getByText('Row Level Security')).toBeInTheDocument();
    expect(screen.getByText('Pipeline stages')).toBeInTheDocument();
    expect(screen.getByText('10 Stages')).toBeInTheDocument();
  });

  it('triggers test local push notification when clicking Test Local Push', () => {
    render(<CRMSettings />);

    const testBtn = screen.getByRole('button', { name: /test local push/i });
    fireEvent.click(testBtn);

    expect(notificationService.showNotification).toHaveBeenCalledWith(
      'Test Notification',
      expect.objectContaining({
        body: 'This is a test notification from CRM Settings.',
        tag: 'test-push',
      })
    );
  });

  it('handles push notification subscription click and updates status', async () => {
    // Mock Notification object
    const originalNotification = window.Notification;
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default' },
      writable: true,
      configurable: true,
    });

    vi.mocked(pushNotificationService.subscribeToPushNotifications).mockResolvedValue(true);

    render(<CRMSettings />);

    const enableBtn = screen.getByRole('button', { name: /enable notifications/i });
    expect(enableBtn).toBeInTheDocument();

    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(pushNotificationService.subscribeToPushNotifications).toHaveBeenCalled();
      // Button disappears once granted
      expect(screen.queryByRole('button', { name: /enable notifications/i })).not.toBeInTheDocument();
    });

    window.Notification = originalNotification;
  });
});
