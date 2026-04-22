import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreVertical } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  'New Leads': 'bg-blue-500',
  'Contacted': 'bg-cyan-500',
  'Interested': 'bg-amber-500',
  'Proposal Sent': 'bg-purple-500',
  'Negotiation': 'bg-cyan-500',
  'Won (Converted)': 'bg-green-500',
  'Onboarding': 'bg-cyan-500',
  'Completed': 'bg-gray-500',
  'Lost': 'bg-red-500',
};

export default function CRMLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*').eq('workspace_id', user?.workspace_id).order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase();
    return !q || l.company_name?.toLowerCase().includes(q) || l.contact_person?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
  });

  if (loading) return null;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage all your sales leads</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto shadow-lg shadow-primary/20">
          <Plus size={18} className="mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button className="px-6 py-2.5 bg-background border border-input rounded-xl hover:bg-card transition-colors text-foreground text-sm font-bold shadow-sm">
          Filter
        </button>
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Name / Company</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Contact</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Service</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Stage</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Value</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Owner</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border hover:bg-background/40 transition-colors">
                  <td className="px-4 lg:px-6 py-4 min-w-[180px]">
                    <div className="font-medium text-foreground">{lead.contact_person}</div>
                    <div className="text-xs text-muted-foreground">{lead.company_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground">{lead.email}</div>
                    <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{lead.service_interest || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STAGE_COLORS[lead.status] || 'bg-gray-500'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">₹{(lead.estimated_value || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className={`w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white`}>
                      {(lead.contact_person || 'U')[0]}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-background rounded transition-colors text-muted-foreground">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
