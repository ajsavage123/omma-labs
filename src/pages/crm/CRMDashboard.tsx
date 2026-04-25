import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Clock, AlertCircle, Briefcase, IndianRupee, CheckCircle2, ChevronRight, Zap } from "lucide-react";

export default function CRMDashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      const loadData = () => Promise.all([fetchLeads(), fetchTasks()]).finally(() => setLoading(false));
      loadData();

      // Enable Realtime Subscription for Dashboard (Leads & Tasks)
      const leadsChannel = supabase
        .channel(`dashboard_leads_${user.workspace_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `workspace_id=eq.${user.workspace_id}` }, () => fetchLeads())
        .subscribe();

      const tasksChannel = supabase
        .channel(`dashboard_tasks_${user.workspace_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks', filter: `workspace_id=eq.${user.workspace_id}` }, () => fetchTasks())
        .subscribe();

      return () => {
        supabase.removeChannel(leadsChannel);
        supabase.removeChannel(tasksChannel);
      };
    }
  }, [user?.workspace_id]);

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
    { name: "New Leads", value: leads.filter(l => l.status === 'New Leads').length, color: "#6366f1" },
    { name: "Contacted", value: leads.filter(l => l.status === 'Contacted').length, color: "#06B6D4" },
    { name: "Interested", value: leads.filter(l => l.status === 'Interested').length, color: "#F59E0B" },
    { name: "Proposal/Quotation", value: leads.filter(l => l.status === 'Proposal Sent').length, color: "#8B5CF6" },
    { name: "Negotiation", value: leads.filter(l => l.status === 'Negotiation').length, color: "#10B981" },
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
    <div className="h-full flex items-center justify-center bg-[#030305]">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  const stats = [
    { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString()}`, icon: IndianRupee, trend: "+12%", color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Closed Won", value: `₹${closedWonValue.toLocaleString()}`, icon: CheckCircle2, trend: "+5%", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Due Today", value: tasksDueToday.length, icon: Clock, trend: "Normal", color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Overdue", value: overdueTasks.length, icon: AlertCircle, trend: "-2%", color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
               <Zap className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tighter italic uppercase">CRM Engine</h1>
          </div>
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] ml-1">Live Intelligence // Workspace Core</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Operational</span>
           </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <Card className="relative p-6 lg:p-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2rem] overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:bg-[#0c0c0e] group-hover:border-indigo-500/30 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 ${stat.bg} rounded-2xl ${stat.color} shadow-inner transition-transform group-hover:scale-110 duration-500`}>
                  <stat.icon size={24} />
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Trend</span>
                   <span className={`text-xs font-black ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'} bg-white/5 px-2 py-0.5 rounded-lg border border-white/5`}>{stat.trend}</span>
                </div>
              </div>
              <div className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
              <div className="text-3xl lg:text-4xl font-black text-white tracking-tighter leading-none">{stat.value}</div>
              
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <TrendingUp size={120} className="text-indigo-500" />
            </div>
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 italic">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                  Pipeline Distribution
                </h2>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1 ml-4">Financial projection by stage</p>
              </div>
              <div className="flex gap-2">
                 <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase">Live Data</div>
              </div>
            </div>

            <div className="w-full min-h-[400px]">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stageData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="stage" stroke="#475569" style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" style={{ fontSize: "10px", fontWeight: "900" }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: "#0a0a0c", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "#818cf8", fontWeight: "900", fontSize: "12px", textTransform: "uppercase" }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <Card className="p-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <h2 className="text-[11px] font-black text-gray-500 mb-6 uppercase tracking-[0.3em]">Volume Metrics</h2>
              <div className="w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pipelineData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {pipelineData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0a0a0c", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-4">
                 <div className="text-2xl font-black text-white">{leads.length}</div>
                 <div className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Total</div>
              </div>
            </Card>

            {/* Stage Legend */}
            <Card className="p-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2.5rem] shadow-xl">
              <h2 className="text-[11px] font-black text-gray-500 mb-6 uppercase tracking-[0.3em]">Stage Legend</h2>
              <div className="space-y-4">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform group-hover/item:scale-125" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[11px] font-black text-gray-400 group-hover/item:text-white transition-colors uppercase tracking-tight">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-white bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <Card className="p-8 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2.5rem] shadow-xl flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
            <h2 className="text-[11px] font-black text-indigo-400 mb-8 uppercase tracking-[0.4em] italic relative z-10">Intelli-Stream // Updates</h2>
            <div className="space-y-6 flex-1 relative z-10">
              {leads.slice(0, 7).map((lead, index) => (
                <div key={index} className="flex gap-5 items-start group/log cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center flex-shrink-0 text-indigo-400 border border-white/5 group-hover/log:border-indigo-500/30 group-hover/log:scale-110 transition-all duration-300">
                    <Briefcase size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                       <div className="text-[11px] font-black text-white leading-tight truncate uppercase tracking-tight group-hover/log:text-indigo-300 transition-colors">
                        {lead.company_name}
                      </div>
                      <ChevronRight size={14} className="text-gray-700 opacity-0 group-hover/log:opacity-100 transition-all group-hover/log:translate-x-1" />
                    </div>
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                      Moved to <span className="text-indigo-400">{lead.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <Clock size={10} className="text-gray-700" />
                       <div className="text-[9px] text-gray-600 uppercase font-black tracking-widest">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 py-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all active:scale-95 shadow-inner italic">
              Access History Archive
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
