import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, AlertCircle, Calendar, User, Trash2, Loader2, Sparkles, Zap } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function CRMTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchTasks();
      const channel = supabase.channel(`crm_tasks_${user.workspace_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `workspace_id=eq.${user.workspace_id}` }, () => fetchTasks()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user?.workspace_id]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_tasks').select('*, crm_leads(contact_person, company_name)').eq('workspace_id', user?.workspace_id).order('due_date', { ascending: true });
    setTasks(data || []);
    setLoading(false);
  };

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    await supabase.from('crm_tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
    toast.success(`Task marked as ${newStatus}`);
  };

  const deleteTask = async (id: string) => {
    if(!confirm('Delete this task?')) return;
    await supabase.from('crm_tasks').delete().eq('id', id);
    fetchTasks();
    toast.success("Task Deleted");
  };

  if (loading) return null;

  return (
    <div className="space-y-8 bg-[#030305] min-h-screen p-2 sm:p-6">
       {/* Premium Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
         <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
               <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Operation Control</h1>
          </div>
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] ml-1">Daily Objectives & Tasks</p>
        </div>

        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
          <Plus size={16} className="mr-2" /> New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Tasks Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-2">
              <Clock size={16} className="text-amber-500" /> Active Objectives
            </h2>
            <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg border border-amber-500/20">{tasks.filter(t => t.status !== 'Completed').length}</span>
          </div>
          
          <div className="space-y-4">
            {tasks.filter(t => t.status !== 'Completed').map((task) => (
              <Card key={task.id} className="bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 p-6 rounded-[2rem] hover:border-indigo-500/40 transition-all duration-500 group shadow-xl">
                <div className="flex items-start gap-5">
                   <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-1 w-8 h-8 rounded-xl border-2 border-white/10 flex items-center justify-center text-transparent hover:border-emerald-500 hover:text-emerald-500 transition-all active:scale-90 bg-white/5">
                      <CheckCircle2 size={16} />
                   </button>
                   <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-lg tracking-tight mb-2 uppercase italic">{task.title}</h3>
                      <div className="flex flex-wrap gap-4 items-center">
                         <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <Calendar size={12} className="text-indigo-400" />
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'}
                         </div>
                         <div className="flex items-center gap-1.5 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <User size={12} className="text-indigo-400" />
                            {task.crm_leads?.contact_person || 'No Lead'}
                         </div>
                         <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase italic ${
                           task.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                           task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                           'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                         }`}>
                           {task.priority} Priority
                         </div>
                      </div>
                   </div>
                   <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-3 bg-white/5 border border-white/10 rounded-2xl text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                      <Trash2 size={16} />
                   </button>
                </div>
              </Card>
            ))}
            {tasks.filter(t => t.status !== 'Completed').length === 0 && (
              <div className="py-20 bg-[#0a0a0c]/40 border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center opacity-30 gap-4">
                 <Zap size={40} className="text-gray-600" />
                 <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Clear Schedule // No Active Tasks</div>
              </div>
            )}
          </div>
        </div>

        {/* Completed Tasks Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> Archives
            </h2>
            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20">{tasks.filter(t => t.status === 'Completed').length}</span>
          </div>

          <div className="space-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            {tasks.filter(t => t.status === 'Completed').map((task) => (
              <Card key={task.id} className="bg-[#0a0a0c]/50 border-white/5 p-6 rounded-[2rem] hover:border-white/20 transition-all">
                <div className="flex items-start gap-5">
                   <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-1 w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 size={16} />
                   </button>
                   <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-400 text-lg tracking-tight mb-2 uppercase italic line-through decoration-emerald-500/50">{task.title}</h3>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Fulfilled via {task.crm_leads?.company_name || 'System'}</p>
                   </div>
                   <button onClick={() => deleteTask(task.id)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-600 hover:text-rose-400 transition-all">
                      <Trash2 size={16} />
                   </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
