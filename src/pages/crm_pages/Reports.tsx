import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stageData = [
  { stage: "New Leads", value: 210000 },
  { stage: "Contacted", value: 0 },
  { stage: "Interested", value: 1500000 },
  { stage: "Proposal/Quotation", value: 120000 },
  { stage: "Negotiation", value: 250000 },
  { stage: "Won", value: 50000 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Reports</h1>
        <p className="text-muted-foreground">Pipeline analytics and performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Conversion Rate</div>
          <div className="text-3xl font-bold text-foreground mb-1">30.0%</div>
          <div className="text-xs text-muted-foreground">3 won / 10 total</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Avg Deal Size</div>
          <div className="text-3xl font-bold text-foreground mb-1">₹2,10,000</div>
          <div className="text-xs text-muted-foreground">Based on won deals</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Lost Deals</div>
          <div className="text-3xl font-bold text-red-500 mb-1">1</div>
          <div className="text-xs text-muted-foreground">Total ₹30,000</div>
        </Card>
      </div>

      {/* Pipeline Value Chart */}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-4">Pipeline Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Pipeline Value</span>
              <span className="font-semibold text-foreground">₹22,85,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Leads</span>
              <span className="font-semibold text-foreground">8</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Won Deals</span>
              <span className="font-semibold text-green-500">₹6,30,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lost Deals</span>
              <span className="font-semibold text-red-500">₹30,000</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-4">Stage Distribution</h3>
          <div className="space-y-3">
            {[
              { label: "New Leads", value: 2, color: "bg-blue-500" },
              { label: "Contacted", value: 1, color: "bg-cyan-500" },
              { label: "Interested", value: 1, color: "bg-amber-500" },
              { label: "Proposal/Quotation", value: 1, color: "bg-purple-500" },
              { label: "Negotiation", value: 1, color: "bg-cyan-500" },
              { label: "Won", value: 1, color: "bg-green-500" },
              { label: "Onboarding", value: 1, color: "bg-cyan-500" },
              { label: "Completed", value: 1, color: "bg-gray-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
