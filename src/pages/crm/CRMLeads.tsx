import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2, Trash2, Edit2, Download, Upload, Globe, MapPin } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/useToast";

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
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);
  
  // Smart Filters State
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterDate, setFilterDate] = useState("All");
  const [filterSalesperson, setFilterSalesperson] = useState("All");

  // Role check
  const isAdmin = user?.role === 'admin' || user?.role === 'partner';
  const isBusinessMarketing = (user?.designation || '').toLowerCase().includes('business') ||
                               (user?.designation || '').toLowerCase().includes('marketing');
  const isSalesperson = !isAdmin && isBusinessMarketing;
  
  // Lead Form State
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    service_interest: '',
    website: '',
    external_link: '',
    assigned_to: ''
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
      fetchWorkspaceUsers();

      let fetchTimeout: NodeJS.Timeout;
      const throttledFetch = () => {
        clearTimeout(fetchTimeout);
        fetchTimeout = setTimeout(fetchLeads, 1000);
      };

      const channel = supabase
        .channel('crm_leads_table_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_leads',
            filter: `workspace_id=eq.${user.workspace_id}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setLeads(prev => prev.map(lead => 
                lead.id === payload.new.id ? { ...lead, ...payload.new } : lead
              ));
            } else {
              throttledFetch();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.workspace_id]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_leads')
      .select('*, assigned_user:assigned_to(full_name, username)')
      .eq('workspace_id', user?.workspace_id)
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const fetchWorkspaceUsers = async () => {
    if (!user?.workspace_id) return;
    const { data } = await supabase
      .from('users')
      .select('id, full_name, username, designation')
      .eq('workspace_id', user.workspace_id);
    // Only show Business & Marketing team as salespersons
    const salesUsers = (data || []).filter(u => 
      (u.designation || '').toLowerCase().includes('business') || 
      (u.designation || '').toLowerCase().includes('marketing')
    );
    setWorkspaceUsers(salesUsers);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingLeadId(null);
    setFormData({ 
      contact_person: '', 
      company_name: '', 
      email: '', 
      phone: '', 
      estimated_value: '', 
      service_interest: '',
      website: '',
      external_link: '',
      assigned_to: user?.id || ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setIsEditMode(true);
    setEditingLeadId(lead.id);
    setFormData({
      contact_person: lead.contact_person,
      company_name: lead.company_name,
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: lead.estimated_value === 0 ? '' : (lead.estimated_value || '').toString(),
      service_interest: lead.service_interest || '',
      website: lead.website || '',
      external_link: lead.external_link || '',
      assigned_to: lead.assigned_to || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contact_person || !formData.company_name) {
      toast.error("Name and Company are required");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && editingLeadId) {
        const { error } = await supabase
          .from('crm_leads')
          .update(formData)
          .eq('id', editingLeadId);
        if (error) throw error;
        toast.success("Lead updated successfully");
      } else {
        const { error } = await supabase.from('crm_leads').insert([{
          ...formData,
          status: 'New Leads',
          workspace_id: user?.workspace_id,
          source: 'Manual Entry',
          assigned_to: formData.assigned_to || user?.id
        }]);
        if (error) throw error;
        toast.success("Lead added successfully");
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error(isEditMode ? "Failed to update lead" : "Failed to add lead");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      const { error } = await supabase.from('crm_leads').delete().eq('id', id);
      if (error) throw error;
      toast.success("Lead deleted");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to delete lead");
      console.error(error);
    }
  };

  const deleteAllLeads = async () => {
    if (!leads.length) return toast.error("No leads to delete");
    
    const confirm1 = confirm("⚠ WARNING: This will permanently delete ALL leads in your workspace. Are you absolutely sure?");
    if (!confirm1) return;
    
    const confirm2 = confirm("FINAL CONFIRMATION: This action CANNOT be undone. Delete all data?");
    if (!confirm2) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('workspace_id', user?.workspace_id);
      
      if (error) throw error;
      
      toast.success("All leads deleted successfully");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to delete all leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!leads.length) return toast.error("No leads to export");
    const exportData = leads.map(l => ({
      'Contact Name': l.contact_person,
      'Company': l.company_name,
      'Email': l.email,
      'Phone': l.phone,
      'Service': l.service_interest,
      'Status': l.status,
      'Value': l.estimated_value,
      'Date Added': new Date(l.created_at).toLocaleDateString(),
      'Website': l.website || '',
      'Location': l.location || '',
      ...l.custom_data
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newLeads = results.data.map((row: any) => {
            const getField = (keys: string[]) => {
              const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
              return key ? row[key] : null;
            };

            const name = getField(['name', 'contact name', 'contact_person', 'person']) || 'Unknown Name';
            const company = getField(['company', 'company name', 'business']) || 'Unknown Company';
            const email = getField(['email', 'email address']);
            const phone = getField(['phone', 'mobile', 'contact number']);
            const value = parseFloat(getField(['value', 'estimated value', 'amount', 'revenue'])?.replace(/[^0-9.]/g, '') || '0');
            const status = getField(['status', 'stage']) || 'New Leads';
            const website = getField(['website', 'url', 'link']);
            const location = getField(['location', 'address', 'google map link', 'map']);
            
            // Collect all other keys into custom_data
            const knownKeys = ['name', 'contact name', 'contact_person', 'person', 'company', 'company name', 'business', 'email', 'email address', 'phone', 'mobile', 'contact number', 'value', 'estimated value', 'amount', 'revenue', 'status', 'stage', 'website', 'url', 'link', 'location', 'address', 'google map link', 'map'];
            const customData: any = {};
            Object.keys(row).forEach(k => {
              if (!knownKeys.includes(k.toLowerCase().trim())) {
                customData[k] = row[k];
              }
            });

            return {
              contact_person: name,
              company_name: company,
              email: email || null,
              phone: phone || null,
              estimated_value: value,
              status: status,
              website: website || null,
              location: location || null,
              custom_data: customData,
              workspace_id: user?.workspace_id,
              source: 'CSV Import'
            };
          });

          const { error } = await supabase.from('crm_leads').insert(newLeads);
          if (error) throw error;
          
          toast.success(`Successfully imported ${newLeads.length} leads`);
          fetchLeads();
        } catch (error) {
          toast.error("Failed to import leads. Check CSV format.");
          console.error(error);
        } finally {
          setImporting(false);
          if (e.target) e.target.value = ''; // Reset input
        }
      }
    });
  };

  const filteredLeads = leads.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    
    const matchesSearch = !q || 
      (l.company_name || '').toLowerCase().includes(q) || 
      (l.contact_person || '').toLowerCase().includes(q) || 
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.status || '').toLowerCase().includes(q) ||
      (l.service_interest || '').toLowerCase().includes(q);

    const matchesStatus = filterStatus === "All" || l.status === filterStatus;
    const matchesValue = !filterMinValue || (l.estimated_value || 0) >= parseInt(filterMinValue);
    const matchesSalesperson = filterSalesperson === "All" || l.assigned_to === filterSalesperson;
    
    let matchesDate = true;
    if (filterDate === "Last 7 Days") {
      matchesDate = new Date(l.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterDate === "Last 30 Days") {
      matchesDate = new Date(l.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    return matchesSearch && matchesStatus && matchesValue && matchesDate && matchesSalesperson &&
      (!isSalesperson || l.assigned_to === user?.id); // Salespersons only see their own
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">Leads</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Manage all your sales leads</p>
        </div>
        <Button 
          onClick={openAddModal}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus size={18} className="mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Action Bar: Owner filter + bulk actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Admin-only: Owner filter */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-xl px-2.5 py-1.5 shadow-sm">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden sm:inline">Owner:</span>
              <select 
                value={filterSalesperson}
                onChange={(e) => setFilterSalesperson(e.target.value)}
                className="text-xs font-bold text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer pr-3"
              >
                <option value="All">All</option>
                {workspaceUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.username} {u.id === user?.id ? '(Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Business & Marketing: show My Leads badge */}
          {isSalesperson && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">My Leads</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button 
            variant="outline"
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={importing}
            className="border-primary/20 hover:bg-primary/10 text-primary transition-all px-2.5 sm:px-4 h-9"
          >
            {importing ? <Loader2 size={14} className="animate-spin sm:mr-2" /> : <Download size={14} className="sm:mr-2" />}
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            className="border-primary/20 hover:bg-primary/10 text-primary transition-all px-2.5 sm:px-4 h-9"
          >
            <Upload size={14} className="sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            variant="outline"
            onClick={deleteAllLeads}
            className="border-rose-500/20 hover:bg-rose-500/10 text-rose-500 transition-all px-2.5 sm:px-4 h-9"
          >
            <Trash2 size={14} className="sm:mr-2" />
            <span className="hidden sm:inline">Delete All</span>
          </Button>
        </div>
      </div>

      {/* Search + Compact Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none appearance-none font-bold cursor-pointer whitespace-nowrap"
          >
            <option value="All">All Stages</option>
            {Object.keys(STAGE_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input 
            type="number"
            placeholder="Min ₹"
            value={filterMinValue}
            onChange={(e) => setFilterMinValue(e.target.value)}
            className="w-20 sm:w-28 px-3 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none transition-all"
          />
          <select 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none appearance-none font-bold cursor-pointer whitespace-nowrap"
          >
            <option value="All">All Time</option>
            <option value="Last 7 Days">7 Days</option>
            <option value="Last 30 Days">30 Days</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact & Company</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phone</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Links</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Value</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border hover:bg-background/40 transition-colors">
                  <td className="px-4 lg:px-6 py-4 min-w-[180px]">
                    <div className="font-medium text-foreground">{lead.contact_person}</div>
                    <div className="text-xs text-muted-foreground">{lead.company_name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.email || <span className="text-muted-foreground opacity-30 italic">No email</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.phone || <span className="text-muted-foreground opacity-30 italic">No phone</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground font-medium">{lead.service_interest || '—'}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {lead.assigned_user ? (
                       <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                             {(lead.assigned_user.full_name || lead.assigned_user.username || 'U')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{lead.assigned_user.full_name || lead.assigned_user.username}</span>
                       </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <div className="flex gap-2">
                       {lead.website && (
                         <a href={lead.website} target="_blank" rel="noopener noreferrer" 
                            className="p-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 group/link"
                            title="Visit Website">
                            <Globe size={14} className="group-hover/link:rotate-12 transition-transform" />
                         </a>
                       )}
                       {lead.external_link && (
                         <a href={lead.external_link} target="_blank" rel="noopener noreferrer" 
                            className="p-2 bg-rose-600/10 border border-rose-500/30 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 group/link"
                            title="Google Maps">
                            <MapPin size={14} className="group-hover/link:-translate-y-0.5 transition-transform" />
                         </a>
                       )}
                       {!lead.website && !lead.external_link && <span className="text-muted-foreground/30">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${STAGE_COLORS[lead.status] || 'bg-gray-500'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">₹{(lead.estimated_value || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(lead)}
                        className="p-2 hover:bg-primary/10 rounded transition-colors text-primary group"
                        title="Edit Lead"
                      >
                        <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => deleteLead(lead.id)}
                        className="p-2 hover:bg-red-500/10 rounded transition-colors text-red-400 group"
                        title="Delete Lead"
                      >
                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lead Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-500">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/30">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{isEditMode ? 'Update Details' : 'Add to CRM'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-background rounded-2xl transition-colors text-muted-foreground bg-background/50"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Company Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="e.g. ABC Pvt Ltd"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="contact@company.com"
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Service Interest</label>
                <input 
                  type="text" 
                  value={formData.service_interest}
                  onChange={(e) => setFormData({...formData, service_interest: e.target.value})}
                  placeholder="e.g. Web Development, SEO"
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website Link</label>
                  <input 
                    type="url" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Google Maps Link</label>
                  <input 
                    type="url" 
                    value={formData.external_link}
                    onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Assigned Salesperson / Owner</label>
                <select 
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium appearance-none cursor-pointer"
                >
                  <option value="">Select a salesperson...</option>
                  {workspaceUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} {u.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Value (₹)</label>
                  <input 
                    type="text" 
                    value={formData.estimated_value === '0' ? '' : formData.estimated_value}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0')) val = val.substring(1);
                      setFormData({...formData, estimated_value: val});
                    }}
                    placeholder="Enter amount..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <Plus size={20} className="mr-2" />}
                  {isEditMode ? 'Save Changes' : 'Create Lead'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full py-6 text-muted-foreground hover:bg-background rounded-2xl font-bold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


