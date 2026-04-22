import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, MoreVertical, ChevronRight, ChevronLeft, Plus, Loader2, X, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const STAGES = [
  { 
    name: "New Leads", 
    key: 'New Leads', 
    description: "Incoming prospects who haven't been qualified yet. This is your landing zone for all new business.",
    aliases: ['New', 'new', 'NEW_LEAD']
  },
  { 
    name: "Contacted", 
    key: 'Contacted', 
    description: "Initial reach-out performed via email or call. Waiting for first response.",
    aliases: ['contacted', 'CONTACTED']
  },
  { 
    name: "Interested", 
    key: 'Interested', 
    description: "Prospect has responded and shown active interest in your services.",
    aliases: ['interested', 'INTERESTED']
  },
  { 
    name: "Proposal/Quotation", 
    key: 'Proposal Sent', 
    description: "A formal proposal or price quote has been sent for review.",
    aliases: ['Proposal', 'Quotation', 'PROPOSAL_SENT']
  },
  { 
    name: "Negotiation", 
    key: 'Negotiation', 
    description: "Discussing final terms, pricing adjustments, or project scope.",
    aliases: ['negotiation', 'NEGOTIATING']
  },
  { 
    name: "Won", 
    key: 'Won (Converted)', 
    description: "Success! Deal closed, contract signed, or payment received.",
    aliases: ['Won', 'WON', 'Converted', 'CONVERTED']
  },
  { 
    name: "Onboarding", 
    key: 'Onboarding', 
    description: "Project setup phase. Moving from sales to delivery team.",
    aliases: ['onboarding', 'ONBOARDING']
  },
  { 
    name: "Completed", 
    key: 'Completed', 
    description: "Project deliverables handed over and closed successfully.",
    aliases: ['completed', 'COMPLETED', 'Finished']
  },
  { 
    name: "Lost", 
    key: 'Lost', 
    description: "Opportunity did not convert. Keep for future re-engagement.",
    aliases: ['lost', 'LOST', 'Rejected']
  },
];

export default function CRMPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: 0,
    service_interest: ''
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('workspace_id', user?.workspace_id);
    
    if (error) {
      console.error("Supabase Error:", error);
      toast.error("Error fetching leads");
    }
    
    setLeads(data || []);
    setLoading(false);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.contact_person || !newLead.company_name) {
      toast.error("Name and Company are required");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('crm_leads').insert([{
        ...newLead,
        status: 'New Leads',
        workspace_id: user?.workspace_id,
        source: 'Manual Entry'
      }]);

      if (error) throw error;

      toast.success("Lead added to New Leads stage");
      setIsModalOpen(false);
      setNewLead({ contact_person: '', company_name: '', email: '', phone: '', estimated_value: 0, service_interest: '' });
      fetchLeads();
    } catch (error) {
      toast.error("Failed to add lead");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateLeadStage = async (leadId: string, currentStageKey: string, direction: 'forward' | 'backward') => {
    const currentIndex = STAGES.findIndex(s => s.key === currentStageKey || s.aliases.includes(currentStageKey));
    let nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= STAGES.length) return;

    const nextStageKey = STAGES[nextIndex].key;

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: nextStageKey })
        .eq('id', leadId);

      if (error) throw error;

      toast.success(`Moved to ${STAGES[nextIndex].name}`);
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update stage");
      console.error(error);
    }
  };

  const getLeadsForStage = (stage: typeof STAGES[0]) => {
    return leads.filter(l => 
      l.status === stage.key || 
      stage.aliases.includes(l.status)
    );
  };

  const unmappedLeads = leads.filter(l => 
    !STAGES.some(s => s.key === l.status || s.aliases.includes(l.status))
  );

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Pipeline</h1>
          <p className="text-muted-foreground">Manage your sales opportunities</p>
          {unmappedLeads.length > 0 && (
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">
              ⚠ {unmappedLeads.length} leads in New Leads (Unmapped)
            </p>
          )}
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={18} className="mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 h-full min-w-max">
          {STAGES.map((stage, sIdx) => {
            const stageLeads = sIdx === 0 
              ? [...getLeadsForStage(stage), ...unmappedLeads]
              : getLeadsForStage(stage);
            
            const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

            return (
              <div key={stage.name} className="flex-shrink-0 w-80 flex flex-col h-full">
                {/* Stage Header */}
                <div className="mb-4 flex-shrink-0 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{stage.name}</h3>
                      <button 
                        onMouseEnter={() => setShowInfoFor(stage.key)}
                        onMouseLeave={() => setShowInfoFor(null)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <HelpCircle size={14} />
                      </button>
                    </div>
                    <span className="text-xs bg-background text-muted-foreground px-2 py-1 rounded">{stageLeads.length}</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">₹{totalValue.toLocaleString()}</div>
                  
                  {/* Stage Description Tooltip */}
                  {showInfoFor === stage.key && (
                    <div className="absolute top-full left-0 z-50 w-64 p-3 bg-card border border-border shadow-2xl rounded-xl text-xs text-muted-foreground animate-in fade-in zoom-in duration-200">
                      <p className="leading-relaxed font-medium">{stage.description}</p>
                    </div>
                  )}
                </div>

                {/* Stage Column */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className="bg-card border-border p-4 hover:shadow-xl transition-all relative group border-t-2 border-t-transparent hover:border-t-primary/50">
                      {/* Stage Navigation Arrows */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'backward')}
                          disabled={sIdx === 0}
                          className={`p-1 bg-background/90 backdrop-blur rounded-full border border-border shadow-md pointer-events-auto transition-transform active:scale-90 ${sIdx === 0 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                          disabled={sIdx === STAGES.length - 1}
                          className={`p-1 bg-background/90 backdrop-blur rounded-full border border-border shadow-md pointer-events-auto transition-transform active:scale-90 ${sIdx === STAGES.length - 1 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-foreground text-sm tracking-tight">{lead.contact_person}</h4>
                          <p className="text-xs text-muted-foreground font-medium">{lead.company_name}</p>
                        </div>
                        <button className="p-1 hover:bg-background rounded-md transition-colors">
                          <MoreVertical size={14} className="text-muted-foreground" />
                        </button>
                      </div>

                      {/* Contact Actions as SOLID BRAND BUTTONS */}
                      <div className="flex gap-2 my-3 py-3 border-t border-b border-border/50">
                        <button className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95" title="Call">
                          <Phone size={16} />
                          <span className="text-[10px] font-black uppercase">Call</span>
                        </button>
                        <button className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 active:scale-95" title="WhatsApp">
                          <MessageCircle size={16} />
                          <span className="text-[10px] font-black uppercase">WA</span>
                        </button>
                        <button className="flex-1 py-2.5 bg-[#EA4335] hover:bg-[#d93025] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/20 active:scale-95" title="Email">
                          <Mail size={16} />
                          <span className="text-[10px] font-black uppercase">Mail</span>
                        </button>
                      </div>

                      {/* Lead Info */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-foreground">₹{(lead.estimated_value || 0).toLocaleString()}</div>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white border-2 border-card shadow-sm`}>
                          {(lead.contact_person || lead.company_name || 'U')[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Create Task Button with HIGH COLORING */}
                      <button className="w-full mt-3 px-3 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-95 border border-white/10">
                        + Create Action Task
                      </button>
                    </Card>
                  ))}

                  {/* Empty State */}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-border/40 rounded-2xl p-8 text-center bg-background/5">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">No activity</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/50">
              <h2 className="text-xl font-bold text-foreground">New Sales Opportunity</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-background rounded-xl transition-colors text-muted-foreground"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Client Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.contact_person}
                    onChange={(e) => setNewLead({...newLead, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Company *</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({...newLead, company_name: e.target.value})}
                    placeholder="e.g. ABC Pvt Ltd"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="contact@company.com"
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Project Value (₹)</label>
                  <input 
                    type="number" 
                    value={newLead.estimated_value}
                    onChange={(e) => setNewLead({...newLead, estimated_value: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="tel" 
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 text-muted-foreground hover:bg-background rounded-xl">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold">
                  {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                  Create Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
