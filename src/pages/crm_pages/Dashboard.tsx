import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const pipelineData = [
  { name: "New Leads", value: 2, color: "#3B82F6" },
  { name: "Contacted", value: 1, color: "#06B6D4" },
  { name: "Interested", value: 1, color: "#F59E0B" },
  { name: "Proposal/Quotation", value: 1, color: "#8B5CF6" },
  { name: "Negotiation", value: 1, color: "#06B6D4" },
  { name: "Won", value: 1, color: "#10B981" },
  { name: "Onboarding", value: 1, color: "#06B6D4" },
  { name: "Completed", value: 1, color: "#6B7280" },
  { name: "Lost", value: 0, color: "#EF4444" },
];

const stageData = [
  { stage: "New Leads", value: 210000 },
  { stage: "Contacted", value: 0 },
  { stage: "Interested", value: 1500000 },
  { stage: "Proposal/Quotation", value: 120000 },
  { stage: "Negotiation", value: 250000 },
  { stage: "Won", value: 50000 },
];

const recentActivity = [
  {
    name: "Neha Gupta",
    action: "Had a 15min discovery call",
    time: "Today, 01:37 PM",
    user: "Rahul Verma",
  },
  {
    name: "Sanjay Kumar",
    action: "Sent $1.2L proposal for corporate site",
    time: "Today, 01:37 PM",
    user: "Priya Singh",
  },
  {
    name: "Vikram Sharma",
    action: "Sent initial introductory email",
    time: "Yesterday, 01:37 PM",
    user: "Priya Singh",
  },
  {
    name: "Arjun Reddy",
    action: "Demoed previous work",
    time: "Yesterday, 01:37 PM",
    user: "OomaLabs Admin",
  },
  {
    name: "Meera Das",
    action: "Discussing payment terms",
    time: "Yesterday, 01:37 PM",
    user: "Rahul Verma",
  },
];

export default function Dashboard() {
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
          <div className="text-3xl font-bold text-foreground mb-1">₹22,85,000</div>
          <div className="text-xs text-muted-foreground">Across 8 active leads</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Closed Won</div>
          <div className="text-3xl font-bold text-foreground mb-1">₹6,30,000</div>
          <div className="text-xs text-muted-foreground">Total time</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Tasks Due Today</div>
          <div className="text-3xl font-bold text-foreground mb-1">2</div>
          <div className="text-xs text-muted-foreground">0 completed</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Overdue Tasks</div>
          <div className="text-3xl font-bold text-red-500 mb-1">1</div>
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
                data={pipelineData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-xs">
            {pipelineData.map((item) => (
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
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <div className="text-xs font-semibold text-red-500 mb-1">Overdue</div>
              <div className="text-sm font-medium text-foreground">Call Pooja regarding budget</div>
              <div className="text-xs text-muted-foreground mt-1">0 days overdue</div>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <div className="text-xs font-semibold text-yellow-500 mb-1">Today</div>
              <div className="text-sm font-medium text-foreground">Follow up with Vikram</div>
              <div className="text-xs text-muted-foreground mt-1">Vikram Sharma</div>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <div className="text-xs font-semibold text-yellow-500 mb-1">Today</div>
              <div className="text-sm font-medium text-foreground">Send draft contract to Meera</div>
              <div className="text-xs text-muted-foreground mt-1">Meera Das</div>
            </div>
          </div>
        </Card>

        {/* Pipeline Summary */}
        <Card className="p-6 bg-card border-border lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "New Leads", value: "2", color: "text-blue-500" },
              { label: "Contacted", value: "1", color: "text-cyan-500" },
              { label: "Interested", value: "1", color: "text-amber-500" },
              { label: "Proposal/Quotation", value: "1", color: "text-purple-500" },
              { label: "Negotiation", value: "1", color: "text-cyan-500" },
              { label: "Won", value: "1", color: "text-green-500" },
              { label: "Onboarding", value: "1", color: "text-cyan-500" },
              { label: "Completed", value: "1", color: "text-gray-500" },
              { label: "Lost", value: "0", color: "text-red-500" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={`text-2xl font-bold ${item.color} mb-1`}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
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
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  {activity.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {activity.name} - {activity.action}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activity.time} by {activity.user}
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
