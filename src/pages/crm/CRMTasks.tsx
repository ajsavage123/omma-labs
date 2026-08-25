import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Phone, Mail, Trash2, ArrowRight, Loader2, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/useToast";

import { useCRMData } from "@/contexts/CRMDataContext";
import { googleCalendarService } from "@/services/googleCalendarService";

import { getTaskDueDate } from "@/utils/dateUtils";

type CRMLead = Record<string, any>;
type GoogleAccount = { email: string; name: string; expiresAt: number; [key: string]: any };

export default function CRMTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tasks, loading, refreshTasks, refreshLeads, teamMembers, selectedSalesRepId, crmViewMode } = useCRMData();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [sortBy, setSortBy] = useState("nearest_due"); // "newest", "oldest", "nearest_due", "furthest_due"
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [glowingTaskId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user?.workspace_id) return;
    let query = supabase
      .from('crm_leads')
      .select('id, company_name, contact_person, email')
      .eq('workspace_id', user?.workspace_id);

    if (user?.role !== 'admin') {
      query = query.eq('assigned_to', user?.id);
    }
    const { data } = await query;
    setLeads(data || []);
  };

  const [linkedAccounts, setLinkedAccounts] = useState<GoogleAccount[]>([]);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [syncAccount, setSyncAccount] = useState("");
  const [attendeesInput, setAttendeesInput] = useState("");

  useEffect(() => {
    const hasPendingTasks = tasks.some(t => t.status === 'Pending');
    if (!hasPendingTasks) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // refresh every 15s to update highlighting
    return () => clearInterval(timer);
  }, [tasks]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTaskDue = (task: any) => {
    if (task.status !== 'Pending') return false;
    const dueDate = getTaskDueDate(task.due_date, task.due_time);
    if (!dueDate) return false;
    const diffMs = dueDate.getTime() - currentTime.getTime();
    return diffMs <= 30000 && diffMs >= -120000;
  };

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    lead_id: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '',
    activity_type: 'Task',
    custom_activity_type: '',
    priority: 'Medium'
  });

  useEffect(() => {
    const accounts = googleCalendarService.getLinkedAccounts();
    setLinkedAccounts(accounts as GoogleAccount[]);
    if (accounts.length > 0) {
      setSyncAccount((accounts[0] as GoogleAccount).email);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (formData.lead_id) {
      const selectedLead = leads.find(l => l.id === formData.lead_id);
      if (selectedLead?.email) {
        setAttendeesInput(String(selectedLead.email));
      } else {
        setAttendeesInput("");
      }
    } else {
      setAttendeesInput("");
    }
  }, [formData.lead_id, leads]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id) return;
    
    setSubmitting(true);
    try {
      let finalActivityType = formData.activity_type;
      if (formData.activity_type === 'custom') {
        finalActivityType = formData.custom_activity_type.trim() || 'Custom Action';
      }

      const { data: insertedData, error } = await supabase
        .from('crm_tasks')
        .insert([{
          workspace_id: user.workspace_id,
          lead_id: formData.lead_id || null,
          title: formData.title,
          due_date: formData.due_date,
          due_time: formData.due_time || null,
          activity_type: finalActivityType === 'Task' ? 'Task' : 
                         finalActivityType === 'Call' ? 'Call' : 
                         finalActivityType === 'Email' ? 'Email' : 
                         finalActivityType === 'Meeting' ? 'Meeting' : 
                         finalActivityType,
          priority: formData.priority,
          status: 'Pending',
          assigned_to: user.id
        }])
        .select('*, crm_leads(company_name, contact_person, email, phone)')
        .maybeSingle();

      // Code 22P02 = pg_net trigger JSON error - task was still saved, ignore it
      if (error && error.code !== '22P02') throw error;
      
      if (syncToGoogle && syncAccount && insertedData) {
        try {
          const listAttendees = attendeesInput ? attendeesInput.split(',').map(em => em.trim()) : [];
          await googleCalendarService.syncTask(insertedData, syncAccount, listAttendees);
          toast.success("Task synced with Google Calendar");
        } catch (e: unknown) {
          console.error("Google Calendar sync failed:", e);
          toast.error(`Sync failed: ${(e as Error).message}`);
        }
      }

      toast.success("Task created");
      setFormData({
        title: '',
        lead_id: '',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '',
        activity_type: 'Task',
        custom_activity_type: '',
        priority: 'Medium'
      });
      setSyncToGoogle(false);
      setIsModalOpen(false);
      refreshTasks();
    } catch (error) {
      toast.error("Failed to create task");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const isCompleted = checkedTasks.includes(id) || task.status === 'Completed';
    const newStatus = isCompleted ? 'Pending' : 'Completed';
    
    if (newStatus === 'Completed') {
      setCheckedTasks(prev => [...prev, id]);
    } else {
      setCheckedTasks(prev => prev.filter(t => t !== id));
      task.status = 'Pending'; // Optimistic update
    }

    const { error, data: updatedData } = await supabase
      .from('crm_tasks')
      .update({ status: newStatus })
      .eq('id', id)
      .select('*, crm_leads(company_name, contact_person, email, phone)')
      .maybeSingle();
    
    if (!error) {
      if (!isCompleted) toast.success('Task marked as completed');

      // Update Google Calendar event if synced previously
      if (updatedData) {
        const accounts = googleCalendarService.getLinkedAccounts();
        for (const account of accounts) {
          if (Date.now() < account.expiresAt) {
            try {
              await googleCalendarService.syncTask(updatedData, account.email);
            } catch (e) {
              console.warn(`Failed to update task toggle in Google Calendar for account ${account.email}`, e);
            }
          }
        }
      }

      refreshTasks();
      refreshLeads();
    } else {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    
    try {
      // Delete from Google Calendar first
      await googleCalendarService.deleteTaskEvent(id);

      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success("Task deleted");
      refreshTasks();
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error(error);
    }
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // Helper: classify task using full datetime when due_time is set, date-only otherwise
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classifyTask = (task: any) => {
    if (!task.due_date) return 'today'; // No date — treat as today bucket

    const isToday = task.due_date === todayStr;

    if (task.due_time) {
      // Has explicit time — compare full datetime
      const fullDue = getTaskDueDate(task.due_date, task.due_time);
      if (!fullDue) return isToday ? 'today' : task.due_date < todayStr ? 'overdue' : 'upcoming';
      if (fullDue < now) return 'overdue';   // datetime already passed
      if (isToday) return 'today';           // today, time not yet reached
      return 'upcoming';
    }

    // No time set — use date-only comparison
    if (isToday) return 'today';
    if (task.due_date < todayStr) return 'overdue';
    return 'upcoming';
  };

  const counts = {
    today:     tasks.filter(t => t.status !== 'Completed' && classifyTask(t) === 'today').length,
    upcoming:  tasks.filter(t => t.status !== 'Completed' && classifyTask(t) === 'upcoming').length,
    overdue:   tasks.filter(t => t.status !== 'Completed' && classifyTask(t) === 'overdue').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'completed') return task.status === 'Completed';
    if (task.status === 'Completed') return false;
    return classifyTask(task) === activeTab;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (sortBy === 'nearest_due') {
      const dA = getTaskDueDate(a.due_date, a.due_time)?.getTime() ?? 0;
      const dB = getTaskDueDate(b.due_date, b.due_time)?.getTime() ?? 0;
      return dA - dB;
    }
    if (sortBy === 'furthest_due') {
      const dA = getTaskDueDate(a.due_date, a.due_time)?.getTime() ?? 0;
      const dB = getTaskDueDate(b.due_date, b.due_time)?.getTime() ?? 0;
      return dB - dA;
    }
    return 0;
  });

  const tabs = [
    { id: "today", label: "Today", count: counts.today },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "completed", label: "Done", count: counts.completed },
  ];

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  const activeRep = (teamMembers || []).find(m => m.id === selectedSalesRepId);
  const filterLabel = crmViewMode === 'mine' ? 'My Tasks' : 
    selectedSalesRepId === 'all' ? 'All Team Tasks' : 
    activeRep ? `${activeRep.full_name || activeRep.username}` : 'Team Tasks';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-black text-foreground mb-1 tracking-tight">Tasks</h1>
            <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black rounded-full uppercase tracking-wider">
              {filterLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Manage follow-ups and to-dos ({tasks.length} total tasks)</p>
        </div>
        <Button 
          onClick={() => {
            fetchLeads();
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto rounded-xl font-bold shadow-lg shadow-primary/20"
        >
          <Plus size={18} className="mr-2" />
          Add Task
        </Button>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <Card className="relative w-full max-w-lg bg-card border-border shadow-2xl overflow-hidden rounded-[2rem]">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Create New Task</h2>
                  <p className="text-sm text-muted-foreground mt-1">Set a follow-up for your leads</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={createTask} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Task Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Follow up on proposal"
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Due Date</label>
                    <input
                      required
                      type="date"
                      value={formData.due_date}
                      onChange={e => setFormData({...formData, due_date: e.target.value})}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Due Time (Optional)</label>
                    <input
                      type="time"
                      value={formData.due_time}
                      onChange={e => setFormData({...formData, due_time: e.target.value})}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Activity Type</label>
                    <select
                      value={formData.activity_type}
                      onChange={e => setFormData({...formData, activity_type: e.target.value})}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Task" className="bg-background text-foreground">📋 Task</option>
                      <option value="Call" className="bg-background text-foreground">📞 Call</option>
                      <option value="Email" className="bg-background text-foreground">✉️ Email</option>
                      <option value="Meeting" className="bg-background text-foreground">🤝 Meeting</option>
                      <option value="custom" className="bg-background text-foreground">✍️ Custom...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="High" className="bg-background text-foreground">🔴 High</option>
                      <option value="Medium" className="bg-background text-foreground">🟡 Medium</option>
                      <option value="Low" className="bg-background text-foreground">🟢 Low</option>
                    </select>
                  </div>
                </div>

                {formData.activity_type === 'custom' && (
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Custom Action Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.custom_activity_type}
                      onChange={e => setFormData({...formData, custom_activity_type: e.target.value})}
                      placeholder="e.g. Site Visit, Presentation, Code Review"
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Related Lead (Optional)</label>
                  <select
                    value={formData.lead_id}
                    onChange={e => setFormData({...formData, lead_id: e.target.value})}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-background text-foreground">No lead linked</option>
                    {leads.map(lead => (
                      <option key={String(lead.id)} value={String(lead.id)} className="bg-background text-foreground">
                        {String(lead.company_name || lead.contact_person || '')} {lead.contact_person && lead.contact_person !== lead.company_name ? `(${lead.contact_person})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Google Calendar Sync Selector */}
                {linkedAccounts.length > 0 && (
                  <div className="p-4 bg-background border-2 border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-foreground cursor-pointer flex items-center gap-2 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={syncToGoogle}
                          onChange={e => setSyncToGoogle(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                        Sync to Google Calendar
                      </label>
                    </div>

                    {syncToGoogle && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Select Google Account</label>
                          <select
                            value={syncAccount}
                            onChange={e => setSyncAccount(e.target.value)}
                            className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all cursor-pointer"
                          >
                            {linkedAccounts.map(account => (
                              <option key={account.email} value={account.email} className="bg-background text-foreground">
                                {account.name} ({account.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Attendees (comma-separated emails)</label>
                          <input
                            type="text"
                            value={attendeesInput}
                            onChange={e => setAttendeesInput(e.target.value)}
                            placeholder="salesperson@company.com, admin@company.com"
                            className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                          />
                          <p className="text-[9px] text-muted-foreground mt-1 px-1">
                            Invite other users or the lead. Google will email them invitations automatically.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-6 rounded-xl font-bold border-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-6 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
                  >
                    {submitting ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/20 rounded-xl w-full sm:w-auto sm:flex sm:bg-transparent sm:p-0 sm:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-1.5 sm:px-4 sm:py-3 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-none sm:border-b-2 ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground sm:bg-transparent sm:border-primary sm:text-primary shadow-sm sm:shadow-none"
                  : "text-muted-foreground hover:text-foreground sm:hover:bg-transparent"
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                activeTab === tab.id 
                  ? 'bg-primary-foreground text-primary sm:bg-primary sm:text-white' 
                  : 'bg-background/50 text-muted-foreground sm:bg-background'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto px-1 sm:px-0">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sort:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[11px] font-bold text-foreground bg-card focus:outline-none appearance-none cursor-pointer border-2 border-border rounded-xl px-3 py-2 shadow-sm w-full sm:w-auto"
          >
            <option value="nearest_due" className="bg-background text-foreground">Nearest Due</option>
            <option value="furthest_due" className="bg-background text-foreground">Furthest Due</option>
            <option value="newest" className="bg-background text-foreground">Recently Created</option>
            <option value="oldest" className="bg-background text-foreground">Oldest Created</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const isDone = checkedTasks.includes(task.id) || task.status === 'Completed';
          const priorityColor = task.priority === 'High' 
            ? 'bg-red-500/15 text-red-500 border-red-500/20' 
            : task.priority === 'Low' 
              ? 'bg-green-500/15 text-green-500 border-green-500/20' 
              : 'bg-amber-500/15 text-amber-500 border-amber-500/20';

          const isHighlighted = isTaskDue(task) && !isDone;

          return (
            <Card 
              key={task.id} 
              className={`bg-card border-border p-4 sm:p-5 hover:bg-background/50 transition-all ${isDone ? 'opacity-60' : ''} ${
                glowingTaskId === task.id
                  ? 'ring-4 ring-emerald-500 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.8)] scale-[1.02] bg-emerald-500/10 z-30 animate-pulse'
                  : isHighlighted 
                  ? 'ring-4 ring-indigo-500 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.4)] scale-[1.01] bg-indigo-500/5 z-20' 
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 size={22} className="text-primary" />
                  ) : (
                    <div className="w-[22px] h-[22px] border-2 border-muted-foreground rounded-full hover:border-primary transition-colors" />
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-bold text-sm sm:text-base ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${priorityColor}`}>
                        {task.priority || 'Medium'}
                      </span>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex items-center gap-1 font-semibold">
                        {task.activity_type === "Call" ? (
                          <Phone size={12} />
                        ) : task.activity_type === "Email" ? (
                          <Mail size={12} />
                        ) : task.activity_type === "Meeting" ? (
                          <Calendar size={12} />
                        ) : (
                          <FileText size={12} />
                        )}
                        {task.activity_type || 'Task'}
                      </div>
                      <span className="font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'} 
                        {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                      </span>
                      {task.crm_leads && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-semibold text-foreground">
                            {task.crm_leads.company_name || task.crm_leads.contact_person}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Action Links - Separated and divider-aligned on mobile to prevent overlaps */}
                    <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pt-2 sm:pt-0 border-t border-border/30 sm:border-none justify-start sm:justify-end w-full sm:w-auto">
                      {task.crm_leads && (
                        <Link 
                          to={`/crm/pipeline?search=${encodeURIComponent(task.crm_leads.company_name || task.crm_leads.contact_person)}`}
                          className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                        >
                          View Lead
                          <ArrowRight size={10} />
                        </Link>
                      )}
                      
                      <a 
                        href={googleCalendarService.generateGoogleCalendarLink(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-primary/15 border border-primary/30 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                        title="Add to Google Calendar directly (No API keys required)"
                      >
                        <Calendar size={10} />
                        Add to Cal
                      </a>

                      <a 
                        href={googleCalendarService.generateGmailComposeLink(
                          task,
                          task.crm_leads?.email || '',
                          googleCalendarService.generateGoogleCalendarLink(task)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                        title="Compose a prefilled Gmail invitation to send"
                      >
                        <Mail size={10} />
                        Gmail Invite
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tasks in this category</p>
          </div>
        )}
      </div>

      
    </div>
  );
}
