import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CRMDashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      Promise.all([fetchLeads(), fetchTasks()]).finally(() => setLoading(false));
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
    { name: "Onboarding", value: leads.filter(l => l.status === 'Onboarding').length, color: "#06B6D4" },
    { name: "Completed", value: leads.filter(l => l.status === 'Completed').length, color: "#6B7280" },
    { name: "Lost", value: leads.filter(l => l.status === 'Lost').length, color: "#EF4444" },
  ];

  const stageData = [
    { stage: "New Leads", value: leads.filter(l => l.status === 'New Leads').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Contacted", value: leads.filter(l => l.status === 'Contacted').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Interested", value: leads.filter(l => l.status === 'Interested').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Proposal", value: leads.filter(l => l.status === 'Proposal Sent').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Negotiation", value: leads.filter(l => l.status === 'Negotiation').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Won", value: leads.filter(l => l.status === 'Won (Converted)').reduce((s,l) => s+(l.estimated_value||0), 0) },
  ];

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to your CRM</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Total Pipeline Value</div>
          <div className="text-3xl font-bold text-foreground mb-1">₹{pipelineValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Across {activeLeads.length} active leads</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Closed Won</div>
          <div className="text-3xl font-bold text-foreground mb-1">₹{closedWonValue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total value</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Tasks Due Today</div>
          <div className="text-3xl font-bold text-foreground mb-1">{tasksDueToday.length}</div>
          <div className="text-xs text-muted-foreground">0 completed</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Overdue Tasks</div>
          <div className="text-3xl font-bold text-red-500 mb-1">{overdueTasks.length}</div>
          <div className="text-xs text-muted-foreground">Requires immediate attention</div>
        </Card>
      </div>

      {/* Charts and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <Card className="p-6 bg-card border-border lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pipelineData.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pipelineData.filter(d => d.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-xs">
            {pipelineData.filter(d => d.value > 0).map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Priority Tasks */}
        <Card className="p-6 bg-card border-border lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Priority Tasks</h2>
          <div className="space-y-4">
            {overdueTasks.slice(0, 2).map(task => (
              <div key={task.id} className="border-l-4 border-red-500 pl-4 py-2">
                <div className="text-xs font-semibold text-red-500 mb-1">Overdue</div>
                <div className="text-sm font-medium text-foreground">{task.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{task.crm_leads?.company_name}</div>
              </div>
            ))}
            {tasksDueToday.slice(0, 3).map(task => (
              <div key={task.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                <div className="text-xs font-semibold text-yellow-500 mb-1">Today</div>
                <div className="text-sm font-medium text-foreground">{task.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{task.crm_leads?.company_name}</div>
              </div>
            ))}
            {overdueTasks.length === 0 && tasksDueToday.length === 0 && (
              <p className="text-sm text-muted-foreground">All caught up!</p>
            )}
          </div>
        </Card>

        {/* Pipeline Summary */}
        <Card className="p-6 bg-card border-border lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            {pipelineData.map((item) => (
              <div key={item.name} className="text-center">
                <div className={`text-2xl font-bold mb-1`} style={{ color: item.color }}>{item.value}</div>
                <div className="text-[10px] text-muted-foreground leading-tight uppercase font-semibold">{item.name}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Value by Stage */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Value by Stage</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="stage" stroke="#CBD5E1" style={{ fontSize: "12px" }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#CBD5E1" />
              <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155" }} />
              <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {leads.slice(0, 5).map((lead, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  {(lead.company_name || 'U')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {lead.company_name} - Stage updated to {lead.status}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
