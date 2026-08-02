import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWidget from '../ChatWidget';
import { notificationService } from '@/utils/notificationService';

// Mock dependencies
const mockUser = {
  id: 'user-me',
  username: 'me',
  full_name: 'Me Myself',
  workspace_id: 'ws-123',
  designation: 'Engineer'
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
  })
}));

const mockToast = { info: vi.fn(), success: vi.fn(), error: vi.fn() };
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
    toasts: [],
    removeToast: vi.fn(),
  })
}));

vi.mock('@/components/Toast', () => ({
  ToastContainer: () => null,
}));

let broadcastCallback: ((payload: any) => void) | null = null;

const mockChannel = {
  on: vi.fn((type: string, filter: any, callback?: any) => {
    if (type === 'broadcast') {
      broadcastCallback = callback || filter;
    }
    return mockChannel;
  }),
  subscribe: vi.fn().mockImplementation((cb?: any) => {
    if (cb) cb('SUBSCRIBED');
    return mockChannel;
  }),
  send: vi.fn(),
  presenceState: vi.fn().mockReturnValue({}),
  track: vi.fn(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => {
        const queryResult: any = {
          eq: vi.fn(() => queryResult),
          order: vi.fn(() => queryResult),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'msg-1',
                message: 'Hello initial',
                user_id: 'user-teammate',
                created_at: new Date().toISOString(),
                users: { username: 'Alex', full_name: 'Alex Teammate' }
              }
            ],
            error: null
          })
        };
        return queryResult;
      }),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'msg-new', created_at: new Date().toISOString() },
            error: null
          })
        }))
      })),
      delete: vi.fn(() => ({
        lt: vi.fn().mockResolvedValue({ error: null })
      }))
    }))
  }
}));

describe('ChatWidget Notification & Push Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requests notification permission on user tap gesture', async () => {
    vi.spyOn(notificationService, 'requestPermission').mockResolvedValue(true);

    await act(async () => {
      render(<ChatWidget />);
    });
    
    // Tap the floating chat bubble button
    const chatBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(chatBtn);
    });

    expect(notificationService.requestPermission).toHaveBeenCalled();
  });

  it('increments the unread badge when a real-time message arrives while closed', async () => {
    await act(async () => {
      render(<ChatWidget />);
    });

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    // Simulate an incoming broadcast message from teammate
    if (broadcastCallback) {
      await act(async () => {
        broadcastCallback!({
          payload: {
            id: 'msg-incoming-999',
            message: 'Hey check this urgent update!',
            user_id: 'user-teammate-2',
            workspace_id: 'ws-123',
            created_at: new Date().toISOString(),
            users: { username: 'Sarah' }
          }
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('handles notificationService.showNotification with ServiceWorker fallback', async () => {
    const mockShowNotification = vi.fn().mockResolvedValue(undefined);

    const MockNotificationClass = function() {} as any;
    MockNotificationClass.permission = 'granted';
    MockNotificationClass.requestPermission = vi.fn().mockResolvedValue('granted');

    Object.defineProperty(window, 'Notification', {
      value: MockNotificationClass,
      writable: true,
      configurable: true
    });

    const mockSWReg = {
      showNotification: mockShowNotification
    };

    const mockSW = {
      getRegistration: vi.fn().mockResolvedValue(mockSWReg),
      ready: Promise.resolve(mockSWReg)
    };

    Object.defineProperty(Object.getPrototypeOf(window.navigator), 'serviceWorker', {
      get: () => mockSW,
      configurable: true
    });

    await notificationService.showNotification('Test Title', { body: 'Test Message', silent: true });

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Test Title',
      expect.objectContaining({
        body: 'Test Message',
        vibrate: [200, 100, 200]
      })
    );
  });
});
