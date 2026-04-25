import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { notificationService } from '@/utils/notificationService';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

export default function TaskNotificationManager() {
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const [, setTasks] = useState<any[]>([]);
  const notifiedIds = useRef<Set<string>>(new Set());
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.workspace_id) return;

    fetchPendingTasks();

    // Listen for new/updated tasks
    const channel = supabase
      .channel('global_task_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks',
          filter: `workspace_id=eq.${user.workspace_id}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT') {
            if (newRecord.status === 'Pending') {
              setTasks(prev => [...prev, newRecord]);
            }
          } else if (eventType === 'UPDATE') {
            if (newRecord.status !== 'Pending') {
              // Remove if no longer pending
              setTasks(prev => prev.filter(t => t.id !== newRecord.id));
            } else {
              // Update or add if now pending
              setTasks(prev => {
                const exists = prev.some(t => t.id === newRecord.id);
                if (exists) {
                  return prev.map(t => t.id === newRecord.id ? { ...t, ...newRecord } : t);
                }
                return [...prev, newRecord];
              });
            }
          } else if (eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    // Check tasks every 30 seconds
    checkInterval.current = setInterval(checkDueTasks, 30000);

    return () => {
      supabase.removeChannel(channel);
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [user?.workspace_id]);

  const fetchPendingTasks = async () => {
    if (!user?.workspace_id) return;

    const { data } = await supabase
      .from('crm_tasks')
      .select('*, crm_leads(company_name)')
      .eq('workspace_id', user.workspace_id)
      .eq('status', 'Pending');
    
    if (data) {
      setTasks(data);
    }
  };

  const checkDueTasks = () => {
    const now = new Date();
    
    setTasks(prevTasks => {
      prevTasks.forEach(task => {
        if (notifiedIds.current.has(task.id)) return;

        let dueDate = new Date(task.due_date);
        
        // If there is a specific due_time (e.g. "14:30:00"), update the dueDate object
        if (task.due_time) {
          const [hours, minutes] = task.due_time.split(':');
          dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        
        const diffMs = dueDate.getTime() - now.getTime();
        
        // Trigger if due time is within 30 seconds from now or was in the last 2 minutes
        if (diffMs <= 30000 && diffMs >= -120000) {
          triggerNotification(task);
        }
      });
      return prevTasks;
    });
  };

  const triggerNotification = (task: any) => {
    if (notifiedIds.current.has(task.id)) return;
    notifiedIds.current.add(task.id);

    const title = `Task Due: ${task.title}`;
    const body = `${task.crm_leads?.company_name ? `Client: ${task.crm_leads.company_name}\n` : ''}${task.description || 'No description'}`;

    // Browser Pop-up
    notificationService.showNotification(title, {
      body,
      tag: task.id, // Prevent duplicate popups for the same task
      requireInteraction: true
    });

    // In-app Toast
    toast.info(`${title} - ${body}`);
  };

  return <div className="fixed bottom-0 right-0 z-50 pointer-events-none"><ToastContainer toasts={toasts} removeToast={removeToast} /></div>;
}
