import { useEffect, useRef } from 'react';
import { notificationService } from '@/utils/notificationService';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { useCRMData } from '@/contexts/CRMDataContext';

export default function TaskNotificationManager() {
  const { tasks } = useCRMData();
  const { toasts, toast, removeToast } = useToast();
  const notifiedIds = useRef<Set<string>>(new Set());

  // Filter tasks to show only pending ones
  const pendingTasks = tasks.filter(t => t.status === 'Pending');
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
    
    pendingTasksRef.current.forEach(task => {
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
