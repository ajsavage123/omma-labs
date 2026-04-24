import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2, Trash2, Edit2, Download, Upload, Filter } from "lucide-react";
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
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Smart Filters State
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterDate, setFilterDate] = useState("All");
  
  // Lead Form State
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    service_interest: ''
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();

      // Enable Realtime Subscription
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
          () => {
            fetchLeads();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('workspace_id', user?.workspace_id)
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingLeadId(null);
    setFormData({ contact_person: '', company_name: '', email: '', phone: '', estimated_value: '', service_interest: '' });
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
      estimated_value: lead.estimated_value || 0,
      service_interest: lead.service_interest || ''
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
          source: 'Manual Entry'
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
    
    // Robust search that checks all fields and safely handles null/undefined
    const matchesSearch = !q || 
      (l.company_name || '').toLowerCase().includes(q) || 
      (l.contact_person || '').toLowerCase().includes(q) || 
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.status || '').toLowerCase().includes(q) ||
      (l.service_interest || '').toLowerCase().includes(q);

    const matchesStatus = filterStatus === "All" || l.status === filterStatus;
    const matchesValue = !filterMinValue || (l.estimated_value || 0) >= parseInt(filterMinValue);
    
    let matchesDate = true;
    if (filterDate === "Last 7 Days") {
      matchesDate = new Date(l.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterDate === "Last 30 Days") {
      matchesDate = new Date(l.created_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    return matchesSearch && matchesStatus && matchesValue && matchesDate;
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage all your sales leads</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button 
            variant="outline"
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={importing}
            className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/10 text-primary transition-all"
          >
            {importing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
            Import
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/10 text-primary transition-all"
          >
            <Upload size={16} className="mr-2" />
            Export
          </Button>
          <Button 
            onClick={openAddModal}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} className="mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search and Smart Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search leads by name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium cursor-pointer"
              >
                <option value="All">All Stages</option>
                {Object.keys(STAGE_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-xs">₹</div>
              <input 
                type="number"
                placeholder="Min Value..."
                value={filterMinValue}
                onChange={(e) => setFilterMinValue(e.target.value)}
                className="w-32 pl-7 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <select 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium cursor-pointer"
            >
              <option value="All">All Time</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/30">
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Name / Company</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Email</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Phone</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Service</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Stage</th>
                <th className="px-4 lg:px-6 py-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground">Value</th>
                <th className="px-4 lg:px-6 py-4 text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">Action</th>
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
                  <td className="px-6 py-4 text-sm text-foreground">{lead.service_interest || '—'}</td>
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


