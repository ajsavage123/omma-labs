import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Phone, Mail } from "lucide-react";

export default function CRMTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_tasks').select(`*, crm_leads(company_name, contact_person)`).eq('workspace_id', user?.workspace_id).order('due_date', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  };

  const toggleTask = async (id: string) => {
    const isCompleted = checkedTasks.includes(id);
    if (isCompleted) {
      setCheckedTasks(prev => prev.filter(t => t !== id));
    } else {
      setCheckedTasks(prev => [...prev, id]);
      await supabase.from('crm_tasks').update({ status: 'Completed' }).eq('id', id);
    }
  };

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

  const filteredTasks = tasks.filter((task) => {
    const dueDate = new Date(task.due_date);
    if (activeTab === "completed") return task.status === "Completed";
    if (task.status === "Completed") return false;
    
    if (activeTab === "today") return dueDate >= todayStart && dueDate <= todayEnd;
    if (activeTab === "upcoming") return dueDate > todayEnd;
    if (activeTab === "overdue") return dueDate < todayStart;
    return true;
  });

  const counts = {
    today: tasks.filter(t => t.status !== "Completed" && new Date(t.due_date) >= todayStart && new Date(t.due_date) <= todayEnd).length,
    upcoming: tasks.filter(t => t.status !== "Completed" && new Date(t.due_date) > todayEnd).length,
    overdue: tasks.filter(t => t.status !== "Completed" && new Date(t.due_date) < todayStart).length,
    completed: tasks.filter(t => t.status === "Completed").length,
  };

  const tabs = [
    { id: "today", label: "Today", count: counts.today },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "completed", label: "Done", count: counts.completed },
  ];

  if (loading) return null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground mb-1 tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground font-medium">Manage your follow-ups and to-dos</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto rounded-xl font-bold shadow-lg shadow-primary/20">
          <Plus size={18} className="mr-2" />
          Add Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto custom-scrollbar whitespace-nowrap pb-1">
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

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="bg-card border-border p-4 hover:bg-background/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-1 flex-shrink-0"
              >
                {checkedTasks.includes(task.id) || task.status === 'Completed' ? (
                  <CheckCircle2 size={20} className="text-primary" />
                ) : (
                  <div className="w-5 h-5 border-2 border-muted-foreground rounded-full hover:border-primary transition-colors" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-medium ${checkedTasks.includes(task.id) || task.status === 'Completed' ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {task.activity_type === "Call" ? <Phone size={14} /> : <Mail size={14} />}
                        {task.activity_type}
                      </div>
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{task.crm_leads?.contact_person} ({task.crm_leads?.company_name})</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {new Date(task.due_date) < todayStart && task.status !== 'Completed' && (
                    <div className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-medium rounded-full flex-shrink-0">
                      Overdue
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tasks in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
