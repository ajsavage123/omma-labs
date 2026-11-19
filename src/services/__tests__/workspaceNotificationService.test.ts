import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workspaceNotificationService } from '../workspaceNotificationService';
import { notificationService } from '@/utils/notificationService';

vi.mock('@/utils/notificationService', () => ({
  notificationService: {
    playSound: vi.fn(),
    showNotification: vi.fn()
  }
}));

describe('workspaceNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats chat message payload correctly', () => {
    const record = {
      id: 'chat-1',
      user_id: 'user-2',
      message: 'Hello team!',
      created_at: new Date().toISOString(),
      users: { username: 'Alex' }
    };

    const formatted = workspaceNotificationService.formatPayload('chat_messages', 'INSERT', record, 'user-1');
    expect(formatted).not.toBeNull();
    expect(formatted?.title).toContain('Alex');
    expect(formatted?.body).toBe('Hello team!');
    expect(formatted?.category).toBe('chat');
  });

  it('suppresses notifications triggered by self', () => {
    const event = {
      id: 'evt-1',
      category: 'chat' as const,
      title: 'Chat message',
      body: 'Testing',
      actorId: 'user-1'
    };

    workspaceNotificationService.notify(event, 'user-1');
    expect(notificationService.showNotification).not.toHaveBeenCalled();
  });

  it('dispatches notification for events from other teammates', () => {
    const event = {
      id: 'evt-2',
      category: 'task' as const,
      title: 'Task Assigned',
      body: 'Do unit tests',
      actorId: 'user-2',
      targetUrl: '/crm/tasks'
    };

    workspaceNotificationService.notify(event, 'user-1');
    expect(notificationService.playSound).toHaveBeenCalledWith('alert');
    expect(notificationService.showNotification).toHaveBeenCalledWith('Task Assigned', expect.objectContaining({
      body: 'Do unit tests',
      data: { url: '/crm/tasks' }
    }));
  });
});
