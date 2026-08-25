import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CRMDataContextType {
  leads: any[];
  tasks: any[];
  activities: any[];
  allLeads: any[];
  allTasks: any[];
  allActivities: any[];
  teamMembers: any[];
  loading: boolean;
  refreshLeads: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
  crmViewMode: 'mine' | 'team';
  setCrmViewMode: (mode: 'mine' | 'team') => void;
  selectedSalesRepId: string;
  setSelectedSalesRepId: (repId: string) => void;
  addLead: (payload: any) => Promise<any>;
  updateLead: (id: string, payload: any) => Promise<any>;
  deleteLead: (id: string) => Promise<void>;
  updateLeadStage: (leadId: string, currentStage: string, direction: 'forward' | 'backward') => Promise<void>;
  togglePinLead: (leadId: string, currentStatus: boolean) => Promise<void>;
  addTask: (taskPayload: any) => Promise<any>;
  updateTask: (taskId: string, payload: any) => Promise<any>;
  toggleTaskComplete: (taskId: string, currentStatus: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addActivityNote: (leadId: string, formattedNote: string, leadNotes?: string) => Promise<void>;
  deleteActivityNote: (activityId: string, leadId?: string) => Promise<void>;
}

const CRMDataContext = createContext<CRMDataContextType | undefined>(undefined);

export function CRMDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [crmViewMode, setCrmViewModeState] = useState<'mine' | 'team'>('mine');
  const [selectedSalesRepId, setSelectedSalesRepIdState] = useState<string>('mine');

  const setCrmViewMode = useCallback((mode: 'mine' | 'team') => {
    setCrmViewModeState(mode);
    if (mode === 'mine') {
      setSelectedSalesRepIdState('mine');
    } else if (selectedSalesRepId === 'mine') {
      setSelectedSalesRepIdState('all');
    }
  }, [selectedSalesRepId]);

  const setSelectedSalesRepId = useCallback((repId: string) => {
    setSelectedSalesRepIdState(repId);
    if (repId === 'mine') {
      setCrmViewModeState('mine');
    } else {
      setCrmViewModeState('team');
    }
  }, []);

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

  const fetchTeamMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, role, designation, created_at')
        .eq('workspace_id', workspaceId);
      if (error) throw error;

      // Strict CRM Authorization filter:
      // Include only admins and Business/Marketing designation members.
      // Exclude placeholder system admin accounts.
      const filtered = (data || []).filter(u => {
        const isPlaceholder = ['admin', 'oomadmin'].includes(u.username?.toLowerCase()) && u.id !== userId;
        if (isPlaceholder) return false;

        const isAdminUser = u.role === 'admin';
        const isBizMarketing = (u.designation || '').toLowerCase().includes('business') ||
                               (u.designation || '').toLowerCase().includes('marketing');
        return isAdminUser || isBizMarketing;
      });

      setTeamMembers(filtered);
    } catch (err: any) {
      console.error("Error fetching team members:", err);
      toast.error(err?.message || "Failed to load team members");
    }
  }, [workspaceId, userId]);

  const fetchLeads = useCallback(async () => {
    if (!workspaceId) return;
    try {
      let query = supabase
        .from('crm_leads')
        .select('*, assigned_user:assigned_to(id, full_name, username), crm_tasks(id, title, due_date, due_time, status, priority)')
        .eq('workspace_id', workspaceId);
        
      if (!isAdmin) {
        query = query.eq('assigned_to', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Deduplicate by id — safety net in case the same record was somehow
      // returned twice (e.g. from a realtime + fetch race that survived cleanup)
      const seenIds = new Set<string>();
      const dedupedData = (data || []).filter(l => {
        if (seenIds.has(l.id)) return false;
        seenIds.add(l.id);
        return true;
      });

      const sortedData = dedupedData.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setLeads(sortedData);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      toast.error(err?.message || "Failed to load leads");
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

      if (!isAdmin && typeof query.or === 'function') {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      if (typeof query.order === 'function') {
        query = query.order('due_date', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      toast.error(err?.message || "Failed to load tasks");
    }
  }, [workspaceId, userId, isAdmin]);

  const fetchActivities = useCallback(async () => {
    if (!workspaceId) return;
    try {
      let query = supabase
        .from('crm_activities')
        .select('*, crm_leads!inner(company_name, contact_person, workspace_id, assigned_to)')
        .eq('crm_leads.workspace_id', workspaceId);

      if (!isAdmin && typeof query.eq === 'function') {
        query = query.eq('crm_leads.assigned_to', userId);
      }

      if (typeof query.order === 'function') {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      toast.error(err?.message || "Failed to load activity log");
    }
  }, [workspaceId, userId, isAdmin]);

  // Use fetch functions directly as refresh functions

  useEffect(() => {
    if (!workspaceId) {
      setLeads([]);
      setTasks([]);
      setActivities([]);
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchLeads(), fetchTasks(), fetchActivities(), fetchTeamMembers()]).finally(() => {
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
              // Preserve nested join fields (assigned_user, crm_tasks) that the flat
              // realtime payload does NOT include — losing them breaks stage-filter logic
              // and causes leads to appear in multiple pipeline columns simultaneously.
              setLeads(current => current.map(l =>
                l.id === newRecord.id
                  ? { ...newRecord, assigned_user: l.assigned_user, crm_tasks: l.crm_tasks }
                  : l
              ));
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
        fetchTeamMembers();
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
  }, [workspaceId, fetchLeads, fetchTasks, fetchActivities, fetchTeamMembers]);

  // In-memory lookup map for team members
  const teamMembersMap = React.useMemo(() => {
    const map = new Map<string, any>();
    teamMembers.forEach(m => map.set(m.id, m));
    return map;
  }, [teamMembers]);

  // Enrich tasks with assigned_user object
  const enrichedAllTasks = React.useMemo(() => {
    return tasks.map(t => ({
      ...t,
      assigned_user: t.assigned_user || (t.assigned_to ? teamMembersMap.get(t.assigned_to) : null)
    }));
  }, [tasks, teamMembersMap]);

  // Enrich activities with user object
  const enrichedAllActivities = React.useMemo(() => {
    return activities.map(a => ({
      ...a,
      user: a.user || (a.user_id ? teamMembersMap.get(a.user_id) : null)
    }));
  }, [activities, teamMembersMap]);

  // Global filtering based on crmViewMode and selectedSalesRepId
  const filteredLeads = React.useMemo(() => {
    if (!isAdmin) return leads;
    if (crmViewMode === 'mine' || selectedSalesRepId === 'mine') {
      return leads.filter(l => l.assigned_to === userId);
    }
    if (selectedSalesRepId === 'all') {
      return leads;
    }
    return leads.filter(l => l.assigned_to === selectedSalesRepId);
  }, [leads, crmViewMode, selectedSalesRepId, isAdmin, userId]);

  const filteredTasks = React.useMemo(() => {
    if (!isAdmin) return enrichedAllTasks;
    if (crmViewMode === 'mine' || selectedSalesRepId === 'mine') {
      return enrichedAllTasks.filter(t => t.assigned_to === userId || t.created_by === userId);
    }
    if (selectedSalesRepId === 'all') {
      return enrichedAllTasks;
    }
    return enrichedAllTasks.filter(t => t.assigned_to === selectedSalesRepId || t.created_by === selectedSalesRepId);
  }, [enrichedAllTasks, crmViewMode, selectedSalesRepId, isAdmin, userId]);

  const filteredActivities = React.useMemo(() => {
    if (!isAdmin) return enrichedAllActivities;
    if (crmViewMode === 'mine' || selectedSalesRepId === 'mine') {
      return enrichedAllActivities.filter(a => a.user_id === userId || a.crm_leads?.assigned_to === userId);
    }
    if (selectedSalesRepId === 'all') {
      return enrichedAllActivities;
    }
    return enrichedAllActivities.filter(a => a.user_id === selectedSalesRepId || a.crm_leads?.assigned_to === selectedSalesRepId);
  }, [enrichedAllActivities, crmViewMode, selectedSalesRepId, isAdmin, userId]);

  const STAGES = [
    { key: 'New Lead', name: 'New Lead' },
    { key: 'Contacted', name: 'Contacted' },
    { key: 'Meeting Scheduled', name: 'Meeting Scheduled' },
    { key: 'Proposal Sent', name: 'Proposal Sent' },
    { key: 'Won', name: 'Won' },
    { key: 'Lost', name: 'Lost' }
  ];

  const addLead = useCallback(async (payload: any) => {
    const { data, error } = await supabase
      .from('crm_leads')
      .insert([{
        workspace_id: user?.workspace_id,
        created_by: user?.id,
        assigned_to: user?.id,
        ...payload
      }])
      .select()
      .single();

    if (error && error.code !== '22P02') throw error;
    toast.success("Lead created successfully!");
    fetchLeads();
    return data;
  }, [user, fetchLeads]);

  const updateLead = useCallback(async (id: string, payload: any) => {
    const { data, error } = await supabase
      .from('crm_leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code !== '22P02') throw error;
    toast.success("Lead updated successfully!");
    fetchLeads();
    return data;
  }, [fetchLeads]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) throw error;
    toast.success("Lead deleted");
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStage = useCallback(async (leadId: string, currentStage: string, direction: 'forward' | 'backward') => {
    const currentIndex = STAGES.findIndex(s => s.key === currentStage);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= STAGES.length) return;
    const nextStageKey = STAGES[nextIndex].key;

    const { error } = await supabase
      .from('crm_leads')
      .update({ status: nextStageKey })
      .eq('id', leadId);

    if (error && error.code !== '22P02') throw error;
    toast.success(`Moved to ${STAGES[nextIndex].name}`);
  }, [STAGES]);

  const togglePinLead = useCallback(async (leadId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('crm_leads')
      .update({ is_pinned: !currentStatus })
      .eq('id', leadId);

    if (error) throw error;
    toast.success(!currentStatus ? "Pinned to top" : "Unpinned");
    fetchLeads();
  }, [fetchLeads]);

  const addTask = useCallback(async (taskPayload: any) => {
    const { data, error } = await supabase
      .from('crm_tasks')
      .insert([{
        workspace_id: user?.workspace_id,
        assigned_to: user?.id,
        ...taskPayload
      }])
      .select('*, crm_leads(company_name, contact_person, email, phone)')
      .maybeSingle();

    if (error && error.code !== '22P02') throw error;
    toast.success("Action scheduled successfully!");
    fetchTasks();
    fetchLeads();
    return data;
  }, [user, fetchTasks, fetchLeads]);

  const updateTask = useCallback(async (taskId: string, payload: any) => {
    const { data, error } = await supabase
      .from('crm_tasks')
      .update(payload)
      .eq('id', taskId)
      .select()
      .maybeSingle();

    if (error) throw error;
    toast.success("Task updated");
    fetchTasks();
    return data;
  }, [fetchTasks]);

  const toggleTaskComplete = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) throw error;
    toast.success(newStatus === 'Completed' ? "Task marked as completed!" : "Task reopened");
    fetchTasks();
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
    if (error) throw error;
    toast.success("Action deleted");
    fetchTasks();
    fetchLeads();
  }, [fetchTasks, fetchLeads]);

  const addActivityNote = useCallback(async (leadId: string, formattedNote: string, leadNotes?: string) => {
    const { error } = await supabase.from('crm_activities').insert([{
      lead_id: leadId,
      user_id: user?.id,
      activity_type: 'note',
      description: formattedNote,
      workspace_id: user?.workspace_id
    }]);

    if (error) throw error;

    const updatedNotes = leadNotes 
      ? `${formattedNote}\n\n---\n\n${leadNotes}`
      : formattedNote;

    const { error: leadErr } = await supabase
      .from('crm_leads')
      .update({ notes: updatedNotes })
      .eq('id', leadId);

    if (leadErr) throw leadErr;

    toast.success("Interaction note logged successfully!");
    fetchActivities();
    fetchLeads();
  }, [user, fetchActivities, fetchLeads]);

  const deleteActivityNote = useCallback(async (activityId: string, _leadId?: string) => {
    const { error } = await supabase.from('crm_activities').delete().eq('id', activityId);
    if (error) throw error;
    toast.success("Note deleted");
    fetchActivities();
    fetchLeads();
  }, [fetchActivities, fetchLeads]);

  return (
    <CRMDataContext.Provider value={{
      leads: filteredLeads,
      tasks: filteredTasks,
      activities: filteredActivities,
      allLeads: leads,
      allTasks: enrichedAllTasks,
      allActivities: enrichedAllActivities,
      teamMembers,
      loading,
      refreshLeads: fetchLeads,
      refreshTasks: fetchTasks,
      refreshActivities: fetchActivities,
      refreshTeamMembers: fetchTeamMembers,
      crmViewMode,
      setCrmViewMode,
      selectedSalesRepId,
      setSelectedSalesRepId,
      addLead,
      updateLead,
      deleteLead,
      updateLeadStage,
      togglePinLead,
      addTask,
      updateTask,
      toggleTaskComplete,
      deleteTask,
      addActivityNote,
      deleteActivityNote
    }}>
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
