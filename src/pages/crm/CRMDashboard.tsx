import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Clock, AlertCircle, Briefcase, IndianRupee, CheckCircle2 } from "lucide-react";

export default function CRMDashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      const loadData = () => Promise.all([fetchLeads(), fetchTasks()]).finally(() => setLoading(false));
      loadData();

      let leadsTimeout: NodeJS.Timeout;
      let tasksTimeout: NodeJS.Timeout;
      
      const throttledLeads = () => {
        clearTimeout(leadsTimeout);
        leadsTimeout = setTimeout(fetchLeads, 1000);
      };

      const throttledTasks = () => {
        clearTimeout(tasksTimeout);
        tasksTimeout = setTimeout(fetchTasks, 1000);
      };

      // Enable Realtime Subscription for Dashboard (Leads & Tasks)
      const leadsChannel = supabase
        .channel('dashboard_leads_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'crm_leads', 
          filter: `workspace_id=eq.${user.workspace_id}` 
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
          } else {
            throttledLeads();
          }
        })
        .subscribe();

      const tasksChannel = supabase
        .channel('dashboard_tasks_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'crm_tasks', 
          filter: `workspace_id=eq.${user.workspace_id}` 
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
          } else {
            throttledTasks();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(tasksChannel);
      };
    }
  }, [user]);

  const fetchLeads = async () => {
    const { data } = await supabase.from('crm_leads').select('*').eq('workspace_id', user?.workspace_id);
    setLeads(data || []);
  };

  const fetchTasks = async () => {
    const { data } = await supabase.from('crm_tasks').select(`*, crm_leads(company_name, contact_person)`).eq('workspace_id', user?.workspace_id).order('due_date', { ascending: true });
    setTasks(data || []);
  };

  const activeLeads = leads.filter(l => !['Lost', 'Not Interested'].includes(l.status));
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const closedWonValue = leads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status)).reduce((s, l) => s + (l.estimated_value || 0), 0);
  
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
  
  const tasksDueToday = tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) >= todayStart && new Date(t.due_date) <= todayEnd);
  const overdueTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < todayStart);

  const pipelineData = [
    { name: "New Leads", value: leads.filter(l => l.status === 'New Leads').length, color: "#3B82F6" },
    { name: "Contacted", value: leads.filter(l => l.status === 'Contacted').length, color: "#06B6D4" },
    { name: "Interested", value: leads.filter(l => l.status === 'Interested').length, color: "#F59E0B" },
    { name: "Proposal/Quotation", value: leads.filter(l => l.status === 'Proposal Sent').length, color: "#8B5CF6" },
    { name: "Negotiation", value: leads.filter(l => l.status === 'Negotiation').length, color: "#06B6D4" },
    { name: "Won", value: leads.filter(l => l.status === 'Won (Converted)').length, color: "#10B981" },
  ];

  const stageData = [
    { stage: "New", value: leads.filter(l => l.status === 'New Leads').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Contact", value: leads.filter(l => l.status === 'Contacted').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Interest", value: leads.filter(l => l.status === 'Interested').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Proposal", value: leads.filter(l => l.status === 'Proposal Sent').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Negotiate", value: leads.filter(l => l.status === 'Negotiation').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Won", value: leads.filter(l => l.status === 'Won (Converted)').reduce((s,l) => s+(l.estimated_value||0), 0) },
  ];

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  const stats = [
    { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString()}`, icon: IndianRupee, trend: "+12%", color: "text-blue-500" },
    { label: "Closed Won", value: `₹${closedWonValue.toLocaleString()}`, icon: CheckCircle2, trend: "+5%", color: "text-green-500" },
    { label: "Due Today", value: tasksDueToday.length, icon: Clock, trend: "Normal", color: "text-amber-500" },
    { label: "Overdue", value: overdueTasks.length, icon: AlertCircle, trend: "-2%", color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">Sales Dashboard</h1>
          <p className="text-sm text-muted-foreground font-medium">Overview of your workspace performance</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5 lg:p-6 bg-card border-border rounded-3xl shadow-xl hover:shadow-2xl transition-all border-b-4 border-b-primary/10 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-background rounded-2xl ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon size={22} />
              </div>
              <span className="text-[10px] font-black bg-background text-muted-foreground px-2 py-1 rounded-full border border-border">{stat.trend}</span>
            </div>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</div>
            <div className="text-2xl lg:text-3xl font-black text-foreground mt-1 tracking-tighter">{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-card border-border rounded-3xl shadow-xl">
            <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Pipeline Value by Stage
            </h2>
            <div className="w-full min-h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="stage" stroke="#64748b" style={{ fontSize: "10px", fontWeight: "bold" }} />
                  <YAxis stroke="#64748b" style={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "1px solid #334155", color: "#f1f5f9" }}
                    itemStyle={{ color: "#7c3aed", fontWeight: "bold" }}
                  />
                  <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card className="p-6 bg-card border-border rounded-3xl shadow-xl">
              <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">Lead Distribution</h2>
              <div className="w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pipelineData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pipelineData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stage Legend */}
            <Card className="p-6 bg-card border-border rounded-3xl shadow-xl">
              <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">Stage Legend</h2>
              <div className="space-y-2.5">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[11px] font-bold text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="p-6 bg-card border-border rounded-3xl shadow-xl flex flex-col h-full">
            <h2 className="text-lg font-black text-foreground mb-6 uppercase tracking-widest text-[11px]">Recent Updates</h2>
            <div className="space-y-5 flex-1">
              {leads.slice(0, 8).map((lead, index) => (
                <div key={index} className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                    <Briefcase size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-foreground leading-tight truncate">
                      {lead.company_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                      Moved to <span className="text-primary">{lead.status}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground/50 mt-1 uppercase font-black">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 bg-background border border-border hover:bg-muted/50 rounded-2xl text-xs font-black uppercase tracking-widest text-muted-foreground transition-all">
              View All Activity
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
