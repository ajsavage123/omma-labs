import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { MOCK_MODE } from '@/lib/mockMode';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { workspaceNotificationService, type WorkspaceNotificationEvent } from '@/services/workspaceNotificationService';

export default function GlobalNotificationManager() {
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();

  const hasCRMAccess = user?.role === 'admin' || 
    user?.designation?.includes('Business Strategy & Marketing Team') ||
    user?.designation?.includes('Marketing & Business');

  useEffect(() => {
    if (!user?.workspace_id) return;

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
        const notif = customEvent.detail;
        toast.info(`${notif.title}\n${notif.body}`);
        
        // Save to DB
        Promise.resolve(supabase.from('notifications').insert({
          workspace_id: user.workspace_id,
          user_id: user.id,
          category: notif.category,
          title: notif.title,
          body: notif.body,
          target_url: notif.targetUrl,
          is_read: false
        })).catch(() => {});
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

    return () => {
      supabase.removeChannel(globalChannel);
      window.removeEventListener('workspace-notification-event', handleCustomNotification);
      window.removeEventListener('workspace-notification-received', handleNotificationReceived);
    };
  }, [user?.workspace_id, user?.id, toast]);

  return (
    <div className="fixed top-4 right-4 z-[99999] pointer-events-none">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
