import { useEffect, useRef } from 'react';
import { notificationService } from '@/utils/notificationService';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { useCRMData } from '@/contexts/CRMDataContext';
import { useAuth } from '@/hooks/useAuth';

export default function TaskNotificationManager() {
  const { user } = useAuth();
  const { tasks } = useCRMData();
  const { toasts, toast, removeToast } = useToast();
  const notifiedIds = useRef<Set<string>>(new Set());
  const lastSoundTimes = useRef<Map<string, number>>(new Map());

  // Filter tasks to show only pending ones assigned to or created by the current user
  const pendingTasks = tasks.filter(t => t.status === 'Pending' && (t.assigned_to === user?.id || t.created_by === user?.id));
  const pendingTasksRef = useRef<any[]>([]);
  pendingTasksRef.current = pendingTasks;

  useEffect(() => {
    // Check tasks immediately
    checkDueTasks();

    const interval = setInterval(checkDueTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkDueTasks = () => {
    const now = new Date();
    let playSoundAlert = false;
    
    pendingTasksRef.current.forEach(task => {
      let dueDate = new Date(task.due_date);
      
      // If there is a specific due_time (e.g. "14:30:00"), update the dueDate object
      if (task.due_time) {
        const [hours, minutes] = task.due_time.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const diffMs = dueDate.getTime() - now.getTime();
      
      // Trigger if due time is within 30 seconds from now or was in the last 10 minutes (600,000ms)
      if (diffMs <= 30000 && diffMs >= -600000) {
        // 1. Show browser notification and in-app toast once
        if (!notifiedIds.current.has(task.id)) {
          triggerNotification(task);
        }

        // 2. Play sound alert reminder every 60 seconds if task is still pending
        const lastSoundTime = lastSoundTimes.current.get(task.id) || 0;
        if (now.getTime() - lastSoundTime >= 60000) {
          playSoundAlert = true;
          lastSoundTimes.current.set(task.id, now.getTime());
        }
      }
    });

    if (playSoundAlert) {
      notificationService.playSound('alert');
    }
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
      requireInteraction: true,
      silent: true, // prevent browser duplicate sound
      data: { url: '/crm/tasks' }
    });

    // In-app Toast
    toast.info(`${title} - ${body}`);
  };

  return <div className="fixed bottom-0 right-0 z-50 pointer-events-none"><ToastContainer toasts={toasts} removeToast={removeToast} /></div>;
}
