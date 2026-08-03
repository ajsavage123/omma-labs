import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface CRMDataContextType {
  leads: any[];
  tasks: any[];
  activities: any[];
  loading: boolean;
  refreshLeads: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshActivities: () => Promise<void>;
}

const CRMDataContext = createContext<CRMDataContextType | undefined>(undefined);

export function CRMDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use refs to keep track of current states to avoid stale closures in subscriptions
  const leadsRef = useRef<any[]>([]);
  const tasksRef = useRef<any[]>([]);
  const activitiesRef = useRef<any[]>([]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  const workspaceId = user?.workspace_id;
  const userId = user?.id;
  const isAdmin = user?.role === 'admin';

  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    try {
      let query = supabase
        .from('crm_leads')
        .select('*, assigned_user:assigned_to(full_name, username), crm_tasks(id, title, due_date, due_time, status, priority)')
        .eq('workspace_id', workspaceId);
        
      if (!isAdmin) {
        query = query.eq('assigned_to', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setLeads(sortedData);
    } catch (err) {
      console.error("Error fetching leads:", err);
    }
  }, [workspaceId, userId, isAdmin]);

  const fetchTasks = useCallback(async () => {
    if (!workspaceId || !userId) return;
    try {
      // Admins see all workspace tasks; regular users see only their own assigned tasks
      let query = supabase
        .from('crm_tasks')
        .select('*, crm_leads(company_name, contact_person, email, phone)')
        .eq('workspace_id', workspaceId);

      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  }, [workspaceId, userId, isAdmin]);

  const fetchActivities = useCallback(async () => {
    if (!workspaceId) return;
    try {
      let query = supabase
        .from('crm_activities')
        .select('*, crm_leads!inner(company_name, contact_person, workspace_id, assigned_to)')
        .eq('crm_leads.workspace_id', workspaceId)
        .eq('activity_type', 'note')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('crm_leads.assigned_to', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  }, [workspaceId, userId, isAdmin]);

  const refreshLeads = async () => {
    await fetchLeads();
  };

  const refreshTasks = async () => {
    await fetchTasks();
  };

  const refreshActivities = async () => {
    await fetchActivities();
  };

  useEffect(() => {
    if (!workspaceId) {
      setLeads([]);
      setTasks([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchLeads(), fetchTasks(), fetchActivities()]).finally(() => {
      setLoading(false);
    });

    let fetchLeadsTimeout: NodeJS.Timeout;
    const throttledFetchLeads = () => {
      clearTimeout(fetchLeadsTimeout);
      fetchLeadsTimeout = setTimeout(fetchLeads, 1500);
    };

    let fetchTasksTimeout: NodeJS.Timeout;
    const throttledFetchTasks = () => {
      clearTimeout(fetchTasksTimeout);
      fetchTasksTimeout = setTimeout(fetchTasks, 1500);
    };

    let fetchActivitiesTimeout: NodeJS.Timeout;
    const throttledFetchActivities = () => {
      clearTimeout(fetchActivitiesTimeout);
      fetchActivitiesTimeout = setTimeout(fetchActivities, 1500);
    };

    let activeWorkspaceChannel: any = null;

    // Task Realtime channel stays ALWAYS active 24/7 so follow-ups & assignments NEVER miss a beat
    const taskChannel = supabase
      .channel(`crm_tasks_priority_sync_${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_tasks', filter: `workspace_id=eq.${workspaceId}` },
        () => {
          throttledFetchTasks();
          throttledFetchLeads();
        }
      )
      .subscribe();

    const setupHeavySubscriptions = () => {
      if (document.visibilityState === 'hidden') return;
      if (activeWorkspaceChannel) return;

      activeWorkspaceChannel = supabase
        .channel(`crm_workspace_heavy_sync_${workspaceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_leads', filter: `workspace_id=eq.${workspaceId}` },
          (payload) => {
            const { eventType, new: newRecord } = payload;
            if (eventType === 'UPDATE') {
              setLeads(current => current.map(l => (l.id === newRecord.id ? { ...l, ...newRecord } : l)));
            } else {
              throttledFetchLeads();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_activities' },
          (payload) => {
            const { eventType, new: newRecord } = payload;
            if (eventType === 'UPDATE') {
              setActivities(current => current.map(a => (a.id === newRecord.id ? { ...a, ...newRecord } : a)));
            } else {
              throttledFetchActivities();
            }
          }
        )
        .subscribe();
    };

    const cleanupHeavySubscriptions = () => {
      if (activeWorkspaceChannel) {
        supabase.removeChannel(activeWorkspaceChannel);
        activeWorkspaceChannel = null;
      }
    };

    setupHeavySubscriptions();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupHeavySubscriptions();
      } else {
        setupHeavySubscriptions();
        fetchLeads();
        fetchTasks();
        fetchActivities();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(taskChannel);
      cleanupHeavySubscriptions();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(fetchLeadsTimeout);
      clearTimeout(fetchTasksTimeout);
      clearTimeout(fetchActivitiesTimeout);
    };
  }, [workspaceId, fetchLeads, fetchTasks, fetchActivities]); // Dependencies stabilized

  return (
    <CRMDataContext.Provider value={{ leads, tasks, activities, loading, refreshLeads, refreshTasks, refreshActivities }}>
      {children}
    </CRMDataContext.Provider>
  );
}

export function useCRMData() {
  const context = useContext(CRMDataContext);
  if (context === undefined) {
    throw new Error('useCRMData must be used within a CRMDataProvider');
  }
  return context;
}
