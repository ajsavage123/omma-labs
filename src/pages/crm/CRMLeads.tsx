import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Download, MoreHorizontal, Phone, Mail, Globe, Clock, Zap } from "lucide-react";

export default function CRMLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
      const channel = supabase.channel(`crm_leads_${user.workspace_id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: `workspace_id=eq.${user.workspace_id}` }, () => fetchLeads()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user?.workspace_id]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*').eq('workspace_id', user?.workspace_id).order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const filteredLeads = leads.filter(lead => 
    lead.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="space-y-8 bg-[#030305] min-h-screen p-1 sm:p-4">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
         <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
               <Zap className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Lead Registry</h1>
          </div>
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em] ml-1">Centralized Prospect Database</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-xl">
            <Download size={16} className="mr-2" /> Export
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
            <Plus size={16} className="mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2rem] shadow-2xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search registry by name, company, or email..."
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-14 px-8">
            <Filter size={16} className="mr-2" /> Advanced Filters
          </Button>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="bg-[#0a0a0c]/80 backdrop-blur-2xl border-white/15 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] py-6 px-8">Contact & Company</TableHead>
                <TableHead className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Status</TableHead>
                <TableHead className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Value (Est)</TableHead>
                <TableHead className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Engagement</TableHead>
                <TableHead className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-right px-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20 uppercase italic">
                        {lead.contact_person?.[0] || lead.company_name?.[0]}
                      </div>
                      <div>
                        <div className="font-black text-white text-base tracking-tight uppercase italic">{lead.contact_person}</div>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">{lead.company_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-indigo-300 uppercase tracking-tight italic shadow-inner">
                      {lead.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-black text-white text-base tracking-tighter">₹{(lead.estimated_value || 0).toLocaleString()}</div>
                    <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">High Confidence</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"><Mail size={14}/></button>
                       <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"><Phone size={14}/></button>
                       <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all active:scale-90"><Globe size={14}/></button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-600 hover:text-white hover:bg-white/10 transition-all active:scale-90">
                      <MoreHorizontal size={20} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                       <Zap size={40} className="text-gray-600" />
                       <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">No matching records found in registry</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
