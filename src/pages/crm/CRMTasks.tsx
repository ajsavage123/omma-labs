import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Phone, Mail, Trash2, ArrowRight, Loader2, Calendar, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { useCRMData } from "@/contexts/CRMDataContext";

export default function CRMTasks() {
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  const { tasks, loading, refreshTasks } = useCRMData();
  const [activeTab, setActiveTab] = useState("today");
  const [sortBy, setSortBy] = useState("nearest_due"); // "newest", "oldest", "nearest_due", "furthest_due"
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // refresh every 15s to update highlighting
    return () => clearInterval(timer);
  }, []);

  const isTaskDue = (task: any) => {
    if (task.status !== 'Pending') return false;
    let dueDate = new Date(task.due_date);
    if (task.due_time) {
      const [hours, minutes] = task.due_time.split(':');
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    const diffMs = dueDate.getTime() - currentTime.getTime();
    return diffMs <= 30000 && diffMs >= -120000;
  };

  const [leads, setLeads] = useState<any[]>([]);
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
    
    setSubmitting(true);
    try {
      let finalActivityType = formData.activity_type;
      if (formData.activity_type === 'custom') {
        finalActivityType = formData.custom_activity_type.trim() || 'Custom Action';
      }

      const { error } = await supabase.from('crm_tasks').insert([{
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
      }]);

      if (error) throw error;
      
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
    const isCompleted = checkedTasks.includes(id);
    const newStatus = isCompleted ? 'Pending' : 'Completed';
    
    if (isCompleted) {
      setCheckedTasks(prev => prev.filter(t => t !== id));
    } else {
      setCheckedTasks(prev => [...prev, id]);
    }

    const { error } = await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', id);
    
    if (!error) {
      if (!isCompleted) toast.success('Task marked as completed');
      refreshTasks();
    } else {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task permanently?")) return;
    
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success("Task deleted");
      refreshTasks();
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

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

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
                      <option key={lead.id} value={lead.id} className="bg-background text-foreground">
                        {lead.company_name || lead.contact_person} {lead.contact_person && lead.contact_person !== lead.company_name ? `(${lead.contact_person})` : ''}
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

          const isHighlighted = isTaskDue(task);

          return (
            <Card 
              key={task.id} 
              className={`bg-card border-border p-4 sm:p-5 hover:bg-background/50 transition-all ${isDone ? 'opacity-60' : ''} ${
                isHighlighted 
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

                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-2 text-xs text-muted-foreground">
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
                    
                    {/* View Lead highlighted link */}
                    {task.crm_leads && (
                      <Link 
                        to={`/crm/pipeline?search=${encodeURIComponent(task.crm_leads.company_name || task.crm_leads.contact_person)}`}
                        className="flex items-center gap-1 px-3 py-1 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        View Lead
                        <ArrowRight size={10} />
                      </Link>
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
