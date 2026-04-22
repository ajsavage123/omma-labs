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
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Manage your sales opportunities</p>
          {unmappedLeads.length > 0 && (
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">
              ⚠ {unmappedLeads.length} leads in New Leads (Unmapped)
            </p>
          )}
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto shadow-lg shadow-primary/20"
        >
          <Plus size={18} className="mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto pb-6 scroll-smooth custom-scrollbar">
        <div className="flex gap-4 lg:gap-6 h-full min-w-max pb-2">
          {STAGES.map((stage, sIdx) => {
            const stageLeads = sIdx === 0 
              ? [...getLeadsForStage(stage), ...unmappedLeads]
              : getLeadsForStage(stage);
            
            const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

            return (
              <div key={stage.name} className="flex-shrink-0 w-[280px] sm:w-[320px] flex flex-col h-full bg-background/30 rounded-2xl border border-border/40 overflow-hidden">
                {/* Stage Header */}
                <div className="p-4 flex-shrink-0 relative bg-card/50 border-b border-border/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-sm truncate max-w-[150px]">{stage.name}</h3>
                      <button 
                        onClick={() => setShowInfoFor(showInfoFor === stage.key ? null : stage.key)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <HelpCircle size={14} />
                      </button>
                    </div>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-full">{stageLeads.length}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-black">₹{totalValue.toLocaleString()}</div>
                  
                  {/* Stage Description Tooltip */}
                  {showInfoFor === stage.key && (
                    <div className="absolute top-full left-4 right-4 z-50 p-4 bg-card border border-border shadow-2xl rounded-2xl text-[11px] text-muted-foreground animate-in slide-in-from-top-2 duration-300">
                      <p className="leading-relaxed font-bold tracking-tight">{stage.description}</p>
                    </div>
                  )}
                </div>

                {/* Stage Column */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar bg-background/20">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className="bg-card border-border p-4 hover:shadow-xl transition-all relative group border-t-2 border-t-transparent hover:border-t-primary/50 rounded-2xl overflow-hidden shadow-sm">
                      {/* Stage Navigation Arrows (Hidden on touch, shown on hover/group) */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 lg:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'backward')}
                          disabled={sIdx === 0}
                          className={`p-1.5 bg-background/90 backdrop-blur-md rounded-full border border-border shadow-xl pointer-events-auto transition-all active:scale-75 ${sIdx === 0 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                          disabled={sIdx === STAGES.length - 1}
                          className={`p-1.5 bg-background/90 backdrop-blur-md rounded-full border border-border shadow-xl pointer-events-auto transition-all active:scale-75 ${sIdx === STAGES.length - 1 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-foreground text-sm tracking-tight truncate">{lead.contact_person}</h4>
                          <p className="text-[11px] text-muted-foreground font-black truncate">{lead.company_name}</p>
                        </div>
                        <button className="p-2 hover:bg-background rounded-xl transition-colors ml-2">
                          <MoreVertical size={14} className="text-muted-foreground" />
                        </button>
                      </div>

                      {/* Contact Actions - FLEX WRAP for mobile */}
                      <div className="flex flex-wrap gap-2 my-3 py-3 border-t border-b border-border/40">
                        <button className="flex-1 min-w-[60px] py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/10 active:scale-90" title="Call">
                          <Phone size={14} />
                          <span className="text-[9px] font-black uppercase">Call</span>
                        </button>
                        <button className="flex-1 min-w-[60px] py-2 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/10 active:scale-90" title="WhatsApp">
                          <MessageCircle size={14} />
                          <span className="text-[9px] font-black uppercase">WA</span>
                        </button>
                        <button className="flex-1 min-w-[60px] py-2 bg-[#EA4335] hover:bg-[#d93025] text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/10 active:scale-90" title="Email">
                          <Mail size={14} />
                          <span className="text-[9px] font-black uppercase">Mail</span>
                        </button>
                      </div>

                      {/* Lead Info */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black text-foreground tracking-tighter">₹{(lead.estimated_value || 0).toLocaleString()}</div>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white border-2 border-card shadow-lg`}>
                          {(lead.contact_person || lead.company_name || 'U')[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Create Task Button */}
                      <button className="w-full mt-3 px-3 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                        + Next Action Task
                      </button>
                    </Card>
                  ))}

                  {/* Empty State */}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-border/30 rounded-3xl p-10 text-center bg-background/5">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Empty Stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Lead Modal - RESPONSIVE FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-500">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/30">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">New Opportunity</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Add to Pipeline</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-background rounded-2xl transition-colors text-muted-foreground bg-background/50"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.contact_person}
                    onChange={(e) => setNewLead({...newLead, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Company Name *</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({...newLead, company_name: e.target.value})}
                    placeholder="e.g. ABC Pvt Ltd"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="contact@company.com"
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Value (₹)</label>
                  <input 
                    type="number" 
                    value={newLead.estimated_value}
                    onChange={(e) => setNewLead({...newLead, estimated_value: parseInt(e.target.value) || 0})}
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Phone</label>
                  <input 
                    type="tel" 
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full py-6 text-muted-foreground hover:bg-background rounded-2xl font-bold order-2 sm:order-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 order-1 sm:order-2">
                  {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <Plus size={20} className="mr-2" />}
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
