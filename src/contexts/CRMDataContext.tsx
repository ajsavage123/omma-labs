import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

  const fetchLeads = async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('crm_leads')
      .select('*, assigned_user:assigned_to(full_name, username), crm_tasks(id, title, due_date, due_time, status, priority)')
      .eq('workspace_id', workspaceId);

    const sortedData = (data || []).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setLeads(sortedData);
  };

  const fetchTasks = async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('crm_tasks')
      .select('*, crm_leads(company_name, contact_person)')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });
    setTasks(data || []);
  };

  const fetchActivities = async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('crm_activities')
      .select('*, crm_leads!inner(company_name, contact_person, workspace_id)')
      .eq('crm_leads.workspace_id', workspaceId)
      .eq('activity_type', 'note')
      .order('created_at', { ascending: false });
    setActivities(data || []);
  };

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
      fetchLeadsTimeout = setTimeout(fetchLeads, 1000);
    };

    let fetchTasksTimeout: NodeJS.Timeout;
    const throttledFetchTasks = () => {
      clearTimeout(fetchTasksTimeout);
      fetchTasksTimeout = setTimeout(fetchTasks, 1000);
    };

    let fetchActivitiesTimeout: NodeJS.Timeout;
    const throttledFetchActivities = () => {
      clearTimeout(fetchActivitiesTimeout);
      fetchActivitiesTimeout = setTimeout(fetchActivities, 1000);
    };

    // Single active subscription channel for leads
    const leadsChannel = supabase
      .channel('crm_leads_global_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          const { eventType, new: newRecord } = payload;
          if (eventType === 'UPDATE') {
            setLeads(current =>
              current.map(lead => (lead.id === newRecord.id ? { ...lead, ...newRecord } : lead))
            );
          } else {
            throttledFetchLeads();
          }
        }
      )
      .subscribe();

    // Single active subscription channel for tasks
    const tasksChannel = supabase
      .channel('crm_tasks_global_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          const { eventType, new: newRecord } = payload;
          if (eventType === 'UPDATE') {
            setTasks(current =>
              current.map(task => (task.id === newRecord.id ? { ...task, ...newRecord } : task))
            );
          } else {
            throttledFetchTasks();
          }
        }
      )
      .subscribe();

    // Single active subscription channel for activities
    const activitiesChannel = supabase
      .channel('crm_activities_global_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_activities'
        },
        (payload) => {
          const { eventType, new: newRecord } = payload;
          if (eventType === 'UPDATE') {
            setActivities(current =>
              current.map(act => (act.id === newRecord.id ? { ...act, ...newRecord } : act))
            );
          } else {
            throttledFetchActivities();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(activitiesChannel);
      clearTimeout(fetchLeadsTimeout);
      clearTimeout(fetchTasksTimeout);
      clearTimeout(fetchActivitiesTimeout);
    };
  }, [workspaceId]); // Only trigger when workspaceId changes! Prevents focus refresh bug.

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
