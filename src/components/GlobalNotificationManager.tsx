import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MOCK_MODE } from '@/lib/mockMode';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { workspaceNotificationService, type WorkspaceNotificationEvent } from '@/services/workspaceNotificationService';

// ---------------------------------------------------------------------------
// Toast throttling — max 3 toasts per 5-second window.
// Identical messages are grouped into a single toast with a counter badge.
// ---------------------------------------------------------------------------
const TOAST_WINDOW_MS = 5_000;
const TOAST_MAX_PER_WINDOW = 3;

interface ToastTracker {
  count: number;
  windowStart: number;
  lastKey: string;
  lastCount: number;
}

function createThrottledToast(
  toast: ReturnType<typeof useToast>['toast'],
  tracker: React.MutableRefObject<ToastTracker>
) {
  return (notif: WorkspaceNotificationEvent) => {
    const now = Date.now();
    const t = tracker.current;

    // Reset window if expired
    if (now - t.windowStart > TOAST_WINDOW_MS) {
      t.count = 0;
      t.windowStart = now;
      t.lastKey = '';
      t.lastCount = 0;
    }

    // Drop if over the limit
    if (t.count >= TOAST_MAX_PER_WINDOW) return;

    t.count++;

    const key = `${notif.title}||${notif.body}`;

    // Group identical messages — show count badge
    if (key === t.lastKey && t.lastCount > 0) {
      t.lastCount++;
      toast.info(`${notif.title}\n${notif.body} (×${t.lastCount})`);
    } else {
      t.lastKey = key;
      t.lastCount = 1;
      toast.info(`${notif.title}\n${notif.body}`);
    }
  };
}

export default function GlobalNotificationManager() {
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const trackerRef = useRef<ToastTracker>({ count: 0, windowStart: 0, lastKey: '', lastCount: 0 });

  // Fix: use lowercase matching to avoid designation text variation bugs
  const hasCRMAccess = user?.role === 'admin' ||
    (user?.designation || '').toLowerCase().includes('business') ||
    (user?.designation || '').toLowerCase().includes('marketing');

  useEffect(() => {
    if (!user?.workspace_id) return;

    const throttledToast = createThrottledToast(toast, trackerRef);

    // Listen for custom workspace notification events (used in MOCK_MODE or client dispatches)
    const handleCustomNotification = (e: Event) => {
      const customEvent = e as CustomEvent<WorkspaceNotificationEvent>;
      if (customEvent.detail) {
        workspaceNotificationService.notify(customEvent.detail, user.id);
      }
    };

    // Listen for in-app toast display requests
    const handleNotificationReceived = (e: Event) => {
      const customEvent = e as CustomEvent<WorkspaceNotificationEvent>;
      if (customEvent.detail) {
        throttledToast(customEvent.detail);
      }
    };

    window.addEventListener('workspace-notification-event', handleCustomNotification);
    window.addEventListener('workspace-notification-received', handleNotificationReceived);

    if (MOCK_MODE) {
      return () => {
        window.removeEventListener('workspace-notification-event', handleCustomNotification);
        window.removeEventListener('workspace-notification-received', handleNotificationReceived);
      };
    }

    // Subscribe to Supabase Realtime across workspace tables
    let globalChannel = supabase
      .channel(`global_workspace_push_${user.workspace_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `workspace_id=eq.${user.workspace_id}` },
        (payload) => {
          const event = workspaceNotificationService.formatPayload('projects', payload.eventType, payload.new || payload.old, user);
          if (event) workspaceNotificationService.notify(event, user.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `workspace_id=eq.${user.workspace_id}` },
        (payload) => {
          const event = workspaceNotificationService.formatPayload('chat_messages', payload.eventType, payload.new || payload.old, user);
          if (event) workspaceNotificationService.notify(event, user.id);
        }
      );

    if (hasCRMAccess) {
      globalChannel = globalChannel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_tasks', filter: `workspace_id=eq.${user.workspace_id}` },
          (payload) => {
            const event = workspaceNotificationService.formatPayload('crm_tasks', payload.eventType, payload.new || payload.old, user);
            if (event) workspaceNotificationService.notify(event, user.id);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_leads', filter: `workspace_id=eq.${user.workspace_id}` },
          (payload) => {
            const event = workspaceNotificationService.formatPayload('crm_leads', payload.eventType, payload.new || payload.old, user);
            if (event) workspaceNotificationService.notify(event, user.id);
          }
        );
    }

    globalChannel.subscribe();

    // Workaround: Also listen to manual broadcasts from ChatWidget (in case Postgres Realtime is disabled for the table)
    const chatBroadcastChannel = supabase.channel(`workspace_chat_${user.workspace_id}`)
      .on('broadcast', { event: 'broadcast_chat_message' }, (payload: any) => {
        if (payload.payload) {
          const event = workspaceNotificationService.formatPayload('chat_messages', 'INSERT', payload.payload, user);
          if (event) workspaceNotificationService.notify(event, user.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
      supabase.removeChannel(chatBroadcastChannel);
      window.removeEventListener('workspace-notification-event', handleCustomNotification);
      window.removeEventListener('workspace-notification-received', handleNotificationReceived);
    };
  }, [user?.workspace_id, user?.id, hasCRMAccess, toast]);

  return (
    <div className="fixed top-4 right-4 z-[99999] pointer-events-none">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
