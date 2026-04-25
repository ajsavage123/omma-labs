import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CRMReports() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();

      let fetchTimeout: NodeJS.Timeout;
      const throttledFetch = () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(fetchLeads, 1000);
      };

      const channel = supabase
        .channel('crm_reports_sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'crm_leads', 
          filter: `workspace_id=eq.${user.workspace_id}` 
        }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
          } else {
            throttledFetch();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*').eq('workspace_id', user?.workspace_id);
    setLeads(data || []);
    setLoading(false);
  };

  const wonLeads = leads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status));
  const lostLeads = leads.filter(l => l.status === 'Lost');
  const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length * 100).toFixed(1) : "0.0";
  const avgDealSize = wonLeads.length > 0 ? (wonLeads.reduce((s,l) => s+(l.estimated_value||0), 0) / wonLeads.length) : 0;
  
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
        <h1 className="text-3xl font-bold text-foreground mb-1">Reports</h1>
        <p className="text-muted-foreground">Pipeline analytics and performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Conversion Rate</div>
          <div className="text-3xl font-bold text-foreground mb-1">{conversionRate}%</div>
          <div className="text-xs text-muted-foreground">{wonLeads.length} won / {leads.length} total</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Avg Deal Size</div>
          <div className="text-3xl font-bold text-foreground mb-1">₹{avgDealSize.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Based on won deals</div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="text-sm font-medium text-muted-foreground mb-2">Lost Deals</div>
          <div className="text-3xl font-bold text-red-500 mb-1">{lostLeads.length}</div>
          <div className="text-xs text-muted-foreground">Total ₹{lostLeads.reduce((s,l) => s+(l.estimated_value||0), 0).toLocaleString()}</div>
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
              <span className="font-semibold text-foreground">₹{leads.filter(l => !['Lost', 'Not Interested'].includes(l.status)).reduce((s,l) => s+(l.estimated_value||0), 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Leads</span>
              <span className="font-semibold text-foreground">{leads.filter(l => !['Lost', 'Not Interested', 'Completed'].includes(l.status)).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Won Deals</span>
              <span className="font-semibold text-green-500">₹{wonLeads.reduce((s,l) => s+(l.estimated_value||0), 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lost Deals</span>
              <span className="font-semibold text-red-500">₹{lostLeads.reduce((s,l) => s+(l.estimated_value||0), 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-4">Stage Distribution</h3>
          <div className="space-y-3">
            {[
              { label: "New Leads", value: leads.filter(l => l.status === 'New Leads').length, color: "bg-blue-500" },
              { label: "Contacted", value: leads.filter(l => l.status === 'Contacted').length, color: "bg-cyan-500" },
              { label: "Interested", value: leads.filter(l => l.status === 'Interested').length, color: "bg-amber-500" },
              { label: "Proposal/Quotation", value: leads.filter(l => l.status === 'Proposal Sent').length, color: "bg-purple-500" },
              { label: "Negotiation", value: leads.filter(l => l.status === 'Negotiation').length, color: "bg-cyan-500" },
              { label: "Won", value: leads.filter(l => l.status === 'Won (Converted)').length, color: "bg-green-500" },
              { label: "Onboarding", value: leads.filter(l => l.status === 'Onboarding').length, color: "bg-cyan-500" },
              { label: "Completed", value: leads.filter(l => l.status === 'Completed').length, color: "bg-gray-500" },
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
