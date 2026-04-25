import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Phone, Mail, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";


export default function CRMTasks() {
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [sortBy, setSortBy] = useState("nearest_due"); // "newest", "oldest", "nearest_due", "furthest_due"
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    lead_id: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '',
    activity_type: 'Task',
    priority: 'Medium'
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchTasks();

      let fetchTimeout: NodeJS.Timeout;
      const throttledFetch = () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(fetchTasks, 1000);
      };

      const channel = supabase
        .channel('crm_tasks_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_tasks',
            filter: `workspace_id=eq.${user.workspace_id}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setTasks(prev => prev.map(task => 
                task.id === payload.new.id ? { ...task, ...payload.new } : task
              ));
            } else {
              throttledFetch();
            }
          }
        )
        .subscribe((status, err) => {
          console.log("CRMTasks Realtime status:", status, err);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_tasks')
        .select(`*, crm_leads(company_name, contact_person)`)
        .eq('workspace_id', user?.workspace_id)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Fetch Tasks Error:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('crm_leads')
      .select('id, company_name, contact_person')
      .eq('workspace_id', user?.workspace_id);
    setLeads(data || []);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id) return;
    
    const tempId = Math.random().toString(36).substring(2, 9);
    const selectedLead = leads.find(l => l.id === formData.lead_id);
    const newTask = {
      id: tempId,
      workspace_id: user.workspace_id,
      lead_id: formData.lead_id || null,
      title: formData.title,
      due_date: formData.due_date,
      due_time: formData.due_time || null,
      activity_type: formData.activity_type,
      priority: formData.priority,
      status: 'Pending',
      assigned_to: user.id,
      created_at: new Date().toISOString(),
      crm_leads: selectedLead ? {
        company_name: selectedLead.company_name,
        contact_person: selectedLead.contact_person
      } : null
    };

    // Optimistic UI update
    setTasks(prev => [newTask, ...prev].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
    setIsModalOpen(false);
    setSubmitting(true);

    try {
      const { error } = await supabase.from('crm_tasks').insert([{
        workspace_id: user.workspace_id,
        lead_id: formData.lead_id || null,
        title: formData.title,
        due_date: formData.due_date,
        due_time: formData.due_time || null,
        activity_type: formData.activity_type,
        priority: formData.priority,
        status: 'Pending',
        assigned_to: user.id
      }]);

      if (error) throw error;
      toast.success("Task created");
      setFormData({
        title: '',
        lead_id: '',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '',
        activity_type: 'Task',
        priority: 'Medium'
      });
      fetchTasks();
    } catch (error) {
      toast.error("Failed to create task");
      console.error(error);
      fetchTasks(); // Revert on error
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = async (id: string) => {
    const isCompleted = checkedTasks.includes(id);
    const newStatus = isCompleted ? 'Pending' : 'Completed';
    
    // Optimistic UI update for both checkbox AND the task status
    if (isCompleted) {
      setCheckedTasks(prev => prev.filter(t => t !== id));
    } else {
      setCheckedTasks(prev => [...prev, id]);
    }

    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, status: newStatus } : task
    ));

    const { error } = await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', id);
    
    if (!error && !isCompleted) {
      toast.success('Task marked as completed');
    } else if (error) {
      // Revert if failed
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    
    // Optimistic UI
    setTasks(prev => prev.filter(t => t.id !== id));
    
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
      fetchTasks(); // Revert on error
    }
  };

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const counts = {
    today: tasks.filter(t => t.status !== "Completed" && t.due_date === todayStr).length,
    upcoming: tasks.filter(t => t.status !== "Completed" && t.due_date > todayStr).length,
    overdue: tasks.filter(t => t.status !== "Completed" && t.due_date < todayStr).length,
    completed: tasks.filter(t => t.status === "Completed").length,
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "completed") return task.status === "Completed";
    if (task.status === "Completed") return false;
    
    if (activeTab === "today") return task.due_date === todayStr;
    if (activeTab === "upcoming") return task.due_date > todayStr;
    if (activeTab === "overdue") return task.due_date < todayStr;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (sortBy === 'nearest_due') return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
    if (sortBy === 'furthest_due') return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime();
    return 0; // default
  });

  const tabs = [
    { id: "today", label: "Today", count: counts.today },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "completed", label: "Done", count: counts.completed },
  ];

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground mb-1 tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground font-medium">Manage your follow-ups and to-dos</p>
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
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="Task">📋 Task</option>
                      <option value="Call">📞 Call</option>
                      <option value="Email">✉️ Email</option>
                      <option value="Meeting">🤝 Meeting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: e.target.value})}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Related Lead (Optional)</label>
                  <select
                    value={formData.lead_id}
                    onChange={e => setFormData({...formData, lead_id: e.target.value})}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="">No lead linked</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {lead.contact_person} - {lead.company_name}
                      </option>
                    ))}
                  </select>
                </div>

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-1">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-bold text-[11px] uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} 
              <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-background text-muted-foreground'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0 px-2 sm:px-0">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sort:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[11px] font-bold text-foreground bg-background focus:outline-none appearance-none cursor-pointer border border-border rounded-lg px-3 py-1.5 shadow-sm"
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

          return (
            <Card key={task.id} className={`bg-card border-border p-4 sm:p-5 hover:bg-background/50 transition-colors ${isDone ? 'opacity-60' : ''}`}>
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

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 font-semibold">
                      {task.activity_type === "Call" ? <Phone size={12} /> : <Mail size={12} />}
                      {task.activity_type || 'Task'}
                    </div>
                    <span className="font-medium">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'} 
                      {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                    </span>
                    {task.crm_leads && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <Link 
                          to={`/crm/pipeline?search=${encodeURIComponent(task.crm_leads.company_name)}`}
                          className="font-semibold text-primary/80 hover:text-primary hover:underline transition-colors"
                        >
                          {task.crm_leads.contact_person} ({task.crm_leads.company_name})
                        </Link>
                      </>
                    )}
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

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
