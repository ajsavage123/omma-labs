import { useEffect, useRef } from 'react';
import { notificationService } from '@/utils/notificationService';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { useCRMData } from '@/contexts/CRMDataContext';
import { useAuth } from '@/hooks/useAuth';
import { getTaskDueDate } from '@/utils/dateUtils';

export default function TaskNotificationManager() {
  const { user } = useAuth();
  const { tasks } = useCRMData();
  const { toasts, toast, removeToast } = useToast();
  const notifiedIds = useRef<Set<string>>(new Set());
  const lastSoundTimes = useRef<Map<string, number>>(new Map());
  // Record the exact moment this session started — only notify tasks that become due AFTER this point
  const sessionStart = useRef<number>(Date.now());

  // Filter tasks to show only pending ones assigned to or created by the current user
  const pendingTasks = tasks.filter(t => t.status === 'Pending' && (t.assigned_to === user?.id || t.created_by === user?.id));
  const pendingTasksRef = useRef<any[]>([]);
  pendingTasksRef.current = pendingTasks;

  /** Mark tasks that are already past-due at session start as "already notified" so they're silently skipped. */
  const seedAlreadyDueTasks = () => {
    const now = new Date();
    pendingTasksRef.current.forEach(task => {
      if (!task.due_time || !task.due_date) return;
      const dueDate = getTaskDueDate(task.due_date, task.due_time);
      if (!dueDate) return;

      // If already past due when the session started or past due now, mark as notified silently
      if (dueDate.getTime() <= now.getTime()) {
        notifiedIds.current.add(task.id);
      }
    });
  };

  useEffect(() => {
    seedAlreadyDueTasks();
  }, [pendingTasks]);

  useEffect(() => {
    checkDueTasks();
    const interval = setInterval(checkDueTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkDueTasks = () => {
    const now = new Date();
    let playSoundAlert = false;

    pendingTasksRef.current.forEach(task => {
      // Only trigger time-based notifications for tasks with an explicit due time
      if (!task.due_time || !task.due_date) return;

      const dueDate = getTaskDueDate(task.due_date, task.due_time);
      if (!dueDate) return;

      const dueMs = dueDate.getTime();
      const diffMs = dueMs - now.getTime();

      // Only trigger if: due within next 30s or past due within last 35s AND due time is after session started
      if (diffMs <= 30000 && diffMs >= -35000 && dueMs >= sessionStart.current) {
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

    // 1. Determine task type and icon
    const type = task.activity_type || 'Task';
    let typeIcon = '📋';
    if (type.toLowerCase() === 'call') typeIcon = '📞';
    else if (type.toLowerCase() === 'email') typeIcon = '✉️';
    else if (type.toLowerCase() === 'meeting') typeIcon = '🤝';
    else if (type.toLowerCase() === 'quotation') typeIcon = '📄';

    const title = `${typeIcon} ${type} Due: ${task.title}`;

    // 2. Format client details
    let clientDetails = 'No client linked';
    if (task.crm_leads) {
      const company = task.crm_leads.company_name;
      const contact = task.crm_leads.contact_person;
      if (company && contact && company !== contact) {
        clientDetails = `${company} (${contact})`;
      } else {
        clientDetails = company || contact || 'Unnamed Client';
      }
      
      const phone = task.crm_leads.phone;
      const email = task.crm_leads.email;
      const contacts = [];
      if (phone) contacts.push(phone);
      if (email) contacts.push(email);
      if (contacts.length > 0) {
        clientDetails += ` [${contacts.join(' | ')}]`;
      }
    }

    // 3. Format scheduled time
    let timeDetails = '';
    if (task.due_date) {
      const dateObj = new Date(task.due_date);
      const dateStr = isNaN(dateObj.getTime()) 
        ? task.due_date 
        : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      let formattedTime = '';
      if (task.due_time) {
        const timeParts = task.due_time.split(':');
        if (timeParts.length >= 2) {
          let hours = parseInt(timeParts[0], 10);
          const minutes = timeParts[1];
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          formattedTime = ` @ ${hours}:${minutes} ${ampm}`;
        } else {
          formattedTime = ` @ ${task.due_time}`;
        }
      }
      timeDetails = `${dateStr}${formattedTime}`;
    } else {
      timeDetails = 'Not scheduled';
    }

    const body = `Client: ${clientDetails}\nTime: ${timeDetails}`;

    // Dispatch custom event to trigger swinging bell in layout header
    window.dispatchEvent(new CustomEvent('crm-task-due', { detail: { task } }));

    // Browser Pop-up
    notificationService.showNotification(title, {
      body,
      tag: task.id, // Prevent duplicate popups for the same task
      requireInteraction: true,
      silent: true, // prevent browser duplicate sound
      data: { url: '/crm/tasks' }
    });

    // In-app Toast
    toast.info(`${title}\n${body}`);
  };

  return <div className="fixed bottom-0 right-0 z-50 pointer-events-none"><ToastContainer toasts={toasts} removeToast={removeToast} /></div>;
}

