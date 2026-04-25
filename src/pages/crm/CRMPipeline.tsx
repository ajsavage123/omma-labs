import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, ChevronRight, ChevronLeft, Plus, Loader2, X, HelpCircle, Trash2, Edit2, Pin, Clock, Globe, MapPin, Instagram, FileText } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const STAGES = [
  { name: "New Leads", key: 'New Leads', color: 'from-indigo-500 to-blue-600', textColor: 'text-indigo-400', description: "Incoming prospects.", aliases: ['New', 'new', 'NEW_LEAD'] },
  { name: "Contacted", key: 'Contacted', color: 'from-cyan-500 to-blue-500', textColor: 'text-cyan-400', description: "Initial reach-out performed.", aliases: ['contacted', 'CONTACTED'] },
  { name: "Interested", key: 'Interested', color: 'from-amber-500 to-orange-600', textColor: 'text-amber-400', description: "Prospect has shown active interest.", aliases: ['interested', 'INTERESTED'] },
  { name: "Proposal", key: 'Proposal Sent', color: 'from-purple-500 to-indigo-600', textColor: 'text-purple-400', description: "A formal proposal has been sent.", aliases: ['Proposal', 'Quotation', 'PROPOSAL_SENT'] },
  { name: "Negotiation", key: 'Negotiation', color: 'from-fuchsia-500 to-purple-600', textColor: 'text-fuchsia-400', description: "Discussing final terms.", aliases: ['negotiation', 'NEGOTIATING'] },
  { name: "Won", key: 'Won (Converted)', color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-400', description: "Success! Deal closed.", aliases: ['Won', 'WON', 'Converted', 'CONVERTED'] },
];

export default function CRMPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    service_interest: '',
    website: '',
    external_link: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
      const channel = supabase.channel(`crm_pipeline_${user.workspace_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `workspace_id=eq.${user.workspace_id}` }, () => fetchLeads()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user?.workspace_id]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*').eq('workspace_id', user?.workspace_id);
    const sorted = (data || []).sort((a, b) => (a.is_pinned === b.is_pinned) ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.is_pinned ? -1 : 1);
    setLeads(sorted);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const numericValue = parseInt(formData.estimated_value.replace(/[^0-9]/g, '')) || 0;
      const dataToSave = { ...formData, estimated_value: numericValue, workspace_id: user?.workspace_id };
      
      if (isEditMode && editingLeadId) {
        await supabase.from('crm_leads').update(dataToSave).eq('id', editingLeadId);
        toast.success("Opportunity Updated");
      } else {
        await supabase.from('crm_leads').insert([{ ...dataToSave, status: 'New Leads' }]);
        toast.success("New Opportunity Created");
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      toast.error("Process Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const updateLeadStage = async (id: string, current: string, dir: 'f' | 'b') => {
    const idx = STAGES.findIndex(s => s.key === current || s.aliases.includes(current));
    const next = dir === 'f' ? idx + 1 : idx - 1;
    if (next < 0 || next >= STAGES.length) return;
    await supabase.from('crm_leads').update({ status: STAGES[next].key }).eq('id', id);
    fetchLeads();
    toast.success(`Moved to ${STAGES[next].name}`);
  };

  if (loading) return <div className="h-full flex items-center justify-center bg-[#030305]"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#030305] w-full h-full p-2 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 relative">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Sales Pipeline</h1>
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] mt-1">Real-time Revenue Operations</p>
        </div>
        <Button onClick={() => { setIsEditMode(false); setFormData({ contact_person: '', company_name: '', email: '', phone: '', estimated_value: '', service_interest: '', website: '', external_link: '', notes: '' }); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs px-8 py-6 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
          <Plus size={18} className="mr-2" /> New Opportunity
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-10 custom-horizontal-scrollbar">
        <div className="flex gap-6 h-full min-w-max">
          {STAGES.map((stage, sIdx) => {
            const stageLeads = leads.filter(l => l.status === stage.key || stage.aliases.includes(l.status));
            const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

            return (
              <div key={stage.name} className="w-[340px] flex flex-col bg-[#0a0a0c]/50 rounded-[2.5rem] border border-white/10 overflow-hidden backdrop-blur-xl">
                <div className="p-6 border-b border-white/5 bg-white/5 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stage.color}`}></div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-black ${stage.textColor} text-xs tracking-[0.2em] uppercase`}>{stage.name}</h3>
                    <span className="text-[10px] font-black bg-white/10 text-white px-2 py-0.5 rounded-lg border border-white/10">{stageLeads.length}</span>
                  </div>
                  <div className="text-xl font-black text-white tracking-tighter italic">₹{totalValue.toLocaleString()}</div>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-black/20">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className="group bg-[#0c0c0e]/80 border-white/15 p-6 rounded-[2rem] hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden shadow-xl hover:shadow-indigo-500/10">
                      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         <button onClick={() => { setIsEditMode(true); setEditingLeadId(lead.id); setFormData({ contact_person: lead.contact_person, company_name: lead.company_name, email: lead.email || '', phone: lead.phone || '', estimated_value: lead.estimated_value?.toString() || '', service_interest: lead.service_interest || '', website: lead.website || '', external_link: lead.external_link || '', notes: lead.notes || '' }); setIsModalOpen(true); }} className="p-2 bg-white/5 rounded-xl border border-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"><Edit2 size={12}/></button>
                         <button onClick={async () => { if(confirm('Delete?')) await supabase.from('crm_leads').delete().eq('id', lead.id); fetchLeads(); }} className="p-2 bg-white/5 rounded-xl border border-white/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={12}/></button>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-black text-white text-lg tracking-tight mb-1">{lead.contact_person}</h4>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{lead.company_name}</p>
                      </div>

                      <div className="flex items-center gap-2 mb-6">
                         <div className={`px-3 py-1 bg-gradient-to-r ${stage.color} text-white text-[10px] font-black rounded-lg uppercase italic shadow-lg`}>₹{(lead.estimated_value || 0).toLocaleString()}</div>
                         {lead.service_interest && <div className="px-3 py-1 bg-white/5 border border-white/10 text-gray-400 text-[9px] font-black rounded-lg uppercase truncate max-w-[120px]">{lead.service_interest}</div>}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-6">
                        <button className="py-2.5 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-90"><Phone size={14}/></button>
                        <button className="py-2.5 bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-90"><MessageCircle size={14}/></button>
                        <button className="py-2.5 bg-rose-600/10 border border-rose-600/20 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all active:scale-90"><Mail size={14}/></button>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => updateLeadStage(lead.id, lead.status, 'b')} disabled={sIdx===0} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-0 transition-all"><ChevronLeft size={16}/></button>
                        <button onClick={() => updateLeadStage(lead.id, lead.status, 'f')} disabled={sIdx===STAGES.length-1} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-0 transition-all"><ChevronRight size={16}/></button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <Card className="bg-[#0a0a0c] border border-white/20 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contact Name *</label>
                    <input required type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Company Name *</label>
                    <input required type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Est. Value (₹)</label>
                    <input type="text" value={formData.estimated_value} onChange={e => setFormData({...formData, estimated_value: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Interest</label>
                    <input type="text" value={formData.service_interest} onChange={e => setFormData({...formData, service_interest: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes</label>
                 <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:border-indigo-500 outline-none transition-all font-bold resize-none" rows={3} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-indigo-600/30">
                {submitting ? <Loader2 size={24} className="animate-spin" /> : 'Confirm Opportunity'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
