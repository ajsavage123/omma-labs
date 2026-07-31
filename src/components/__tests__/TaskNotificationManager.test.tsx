import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import TaskNotificationManager from '../TaskNotificationManager';
import { notificationService } from '@/utils/notificationService';

const mockUseCRMData = vi.fn();
vi.mock('@/contexts/CRMDataContext', () => ({
  useCRMData: () => mockUseCRMData(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

const mockUserId = 'user-123';
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: mockUserId, email: 'user@example.com' }
  })
}));

describe('TaskNotificationManager & Scheduling Notifications Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(notificationService, 'showNotification').mockImplementation(vi.fn());
    vi.spyOn(notificationService, 'playSound').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers notification and sound alert when a task becomes due', () => {
    // Pin the fake clock to a real wall-clock time so hour/minute arithmetic is stable
    vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));

    const now = new Date(); // T0 = 10:00:00 UTC
    // Task due 60s from now → due_time = '10:01:00'
    // seedAlreadyDueTasks won't seed it (10:01 > 10:00), and the interval at T0+30s
    // will find diffMs = +30000 which satisfies <= 30000 and >= -35000
    const futureTime = new Date(now.getTime() + 120000);
    const mockTasks = [
      {
        id: 'due-task-1',
        title: 'Call Client Immediately',
        status: 'Pending',
        assigned_to: 'user-123',
        due_date: `${futureTime.getFullYear()}-${String(futureTime.getMonth() + 1).padStart(2, '0')}-${String(futureTime.getDate()).padStart(2, '0')}`,
        due_time: `${String(futureTime.getHours()).padStart(2, '0')}:${String(futureTime.getMinutes()).padStart(2, '0')}`,
        crm_leads: { company_name: 'Tech Corp' }
      }
    ];

    mockUseCRMData.mockReturnValue({ tasks: mockTasks });

    render(<TaskNotificationManager />);

    // Advance fake timers by 100 seconds so diffMs becomes +20s (inside <= 30s window)
    vi.advanceTimersByTime(100000);

    expect(notificationService.showNotification).toHaveBeenCalledWith(
      '📋 Task Due: Call Client Immediately',
      expect.objectContaining({
        tag: 'due-task-1',
        silent: true
      })
    );
    expect(notificationService.playSound).toHaveBeenCalledWith('alert');
  });

  it('does not trigger notification for completed tasks', () => {
    const now = new Date();
    const mockTasks = [
      {
        id: 'completed-task-1',
        title: 'Finished Meeting',
        status: 'Completed',
        due_date: now.toISOString().split('T')[0],
        due_time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
      }
    ];

    mockUseCRMData.mockReturnValue({ tasks: mockTasks });

    render(<TaskNotificationManager />);

    expect(notificationService.showNotification).not.toHaveBeenCalled();
    expect(notificationService.playSound).not.toHaveBeenCalled();
  });
});
