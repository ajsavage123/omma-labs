import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2, Trash2, Edit2, Download, Upload, Globe, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/useToast";
import { useCRMData } from "@/contexts/CRMDataContext";

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

// URL formatting helper to ensure clicking works properly
function formatUrl(url: string) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export default function CRMLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { leads, loading, refreshLeads } = useCRMData();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
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
    assigned_to: '',
    budget: '',
    source: '',
    payment_status: 'Pending',
    amount_paid: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchWorkspaceUsers();
    }
  }, [user?.workspace_id]);

  const fetchWorkspaceUsers = async () => {
    if (!user?.workspace_id) return;
    const { data } = await supabase
      .from('users')
      .select('id, full_name, username, designation')
      .eq('workspace_id', user.workspace_id);
    
    // Set all workspace users so that any user in the workspace is selectable and filterable
    setWorkspaceUsers(data || []);
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
      assigned_to: user?.id || '',
      budget: '',
      source: '',
      payment_status: 'Pending',
      amount_paid: '0',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: any) => {
    setIsEditMode(true);
    setEditingLeadId(lead.id);
    setFormData({
      contact_person: lead.contact_person || '',
      company_name: lead.company_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: lead.estimated_value === 0 ? '' : (lead.estimated_value || '').toString(),
      service_interest: lead.service_interest || '',
      website: lead.website || '',
      external_link: lead.external_link || '',
      assigned_to: lead.assigned_to || '',
      budget: lead.budget === 0 ? '' : (lead.budget || '').toString(),
      source: lead.source || '',
      payment_status: lead.payment_status || 'Pending',
      amount_paid: (lead.amount_paid || 0).toString(),
      notes: lead.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name) {
      toast.error("Company Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const estimatedValueNum = parseInt(formData.estimated_value.replace(/[^0-9.]/g, '')) || 0;
      const budgetNum = parseInt(formData.budget.replace(/[^0-9.]/g, '')) || 0;
      const amountPaidNum = parseInt(formData.amount_paid.replace(/[^0-9.]/g, '')) || 0;

      // Smart name/company fallback so they are not blank or "Unknown Name"
      let finalCompany = formData.company_name.trim();
      let finalContact = formData.contact_person.trim();
      if (!finalContact) {
        finalContact = finalCompany;
      }

      const savePayload = {
        contact_person: finalContact,
        company_name: finalCompany,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        estimated_value: estimatedValueNum,
        service_interest: formData.service_interest.trim() || null,
        website: formData.website.trim() || null,
        external_link: formData.external_link.trim() || null,
        assigned_to: formData.assigned_to || null,
        budget: budgetNum,
        source: formData.source.trim() || 'Manual Entry',
        payment_status: formData.payment_status,
        amount_paid: amountPaidNum,
        notes: formData.notes.trim() || null
      };

      if (isEditMode && editingLeadId) {
        const { error } = await supabase
          .from('crm_leads')
          .update(savePayload)
          .eq('id', editingLeadId);
        if (error) throw error;
        toast.success("Lead updated successfully");
      } else {
        const { error } = await supabase.from('crm_leads').insert([{
          ...savePayload,
          status: 'New Leads',
          workspace_id: user?.workspace_id
        }]);
        if (error) throw error;
        toast.success("Lead added successfully");
      }

      setIsModalOpen(false);
      refreshLeads();
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
      refreshLeads();
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
      setSubmitting(true);
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('workspace_id', user?.workspace_id);
      
      if (error) throw error;
      
      toast.success("All leads deleted successfully");
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete all leads");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (!leads.length) return toast.error("No leads to export");
    const exportData = leads.map(l => ({
      'Company Name': l.company_name,
      'Contact Person': l.contact_person,
      'Email': l.email || '',
      'Phone': l.phone || '',
      'Estimated Value': l.estimated_value || 0,
      'Budget': l.budget || 0,
      'Service Interest': l.service_interest || '',
      'Status': l.status,
      'Source': l.source || '',
      'Payment Status': l.payment_status || 'Pending',
      'Amount Paid': l.amount_paid || 0,
      'Notes': l.notes || '',
      'Website': l.website || '',
      'Google Maps Link': l.external_link || '',
      'Date Added': new Date(l.created_at).toLocaleDateString(),
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

            // Smart mapping fallbacks:
            let name = getField(['name', 'contact name', 'contact_person', 'person', 'contact person']);
            let company = getField(['company', 'company name', 'business', 'company_name']);
            const email = getField(['email', 'email address', 'email_address']);
            const phone = getField(['phone', 'mobile', 'contact number', 'phone number']);
            const value = parseFloat(getField(['value', 'estimated value', 'amount', 'revenue', 'estimated_value'])?.replace(/[^0-9.]/g, '') || '0');
            const budget = parseFloat(getField(['budget', 'estimated budget'])?.replace(/[^0-9.]/g, '') || '0');
            const status = getField(['status', 'stage', 'lead status']) || 'New Leads';
            const website = getField(['website', 'url', 'link', 'website link']);
            const location = getField(['location', 'address', 'google map link', 'map', 'google maps link', 'external_link']);
            const service = getField(['service', 'service interest', 'interest', 'service_interest']);
            const source = getField(['source', 'lead source']) || 'CSV Import';
            const notes = getField(['notes', 'comment', 'description']);
            const paymentStatus = getField(['payment status', 'payment_status']) || 'Pending';
            const amountPaid = parseFloat(getField(['amount paid', 'amount_paid'])?.replace(/[^0-9.]/g, '') || '0');
            
            // Clean names and apply fallback (ensure neither contact_person nor company_name stays blank or "Unknown Name")
            name = name ? name.trim() : '';
            company = company ? company.trim() : '';
            if (company && !name) {
              name = company;
            } else if (name && !company) {
              company = name;
            }

            if (!name) name = 'Unknown Contact';
            if (!company) company = 'Unknown Company';

            // Collect all other keys into custom_data
            const knownKeys = [
              'name', 'contact name', 'contact_person', 'person', 'contact person',
              'company', 'company name', 'business', 'company_name',
              'email', 'email address', 'email_address',
              'phone', 'mobile', 'contact number', 'phone number',
              'value', 'estimated value', 'amount', 'revenue', 'estimated_value',
              'budget', 'estimated budget',
              'status', 'stage', 'lead status',
              'website', 'url', 'link', 'website link',
              'location', 'address', 'google map link', 'map', 'google maps link', 'external_link',
              'service', 'service interest', 'interest', 'service_interest',
              'source', 'lead source',
              'notes', 'comment', 'description',
              'payment status', 'payment_status',
              'amount paid', 'amount_paid'
            ];
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
              budget: budget,
              status: status,
              website: website || null,
              external_link: location || null,
              service_interest: service || null, // Map service correctly or leave blank
              source: source,
              notes: notes || null,
              payment_status: paymentStatus,
              amount_paid: amountPaid,
              custom_data: customData,
              workspace_id: user?.workspace_id
            };
          });

          const { error } = await supabase.from('crm_leads').insert(newLeads);
          if (error) throw error;
          
          toast.success(`Successfully imported ${newLeads.length} leads`);
          refreshLeads();
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

  if (loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

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
                <option value="All" className="bg-background text-foreground">All</option>
                {workspaceUsers.map(u => (
                  <option key={u.id} value={u.id} className="bg-background text-foreground">
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
            disabled={submitting}
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
            <option value="All" className="bg-background text-foreground">All Stages</option>
            {Object.keys(STAGE_COLORS).map(s => <option key={s} value={s} className="bg-background text-foreground">{s}</option>)}
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
            <option value="All" className="bg-background text-foreground">All Time</option>
            <option value="Last 7 Days" className="bg-background text-foreground">7 Days</option>
            <option value="Last 30 Days" className="bg-background text-foreground">30 Days</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="w-10"></th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Company & Contact</th>
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
              {filteredLeads.map((lead) => {
                const isExpanded = expandedRowId === lead.id;
                return (
                  <React.Fragment key={lead.id}>
                    <tr 
                      className="border-b border-border hover:bg-background/40 transition-colors cursor-pointer"
                      onClick={() => setExpandedRowId(isExpanded ? null : lead.id)}
                    >
                      <td className="pl-4 text-center">
                        {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </td>
                      <td className="px-4 lg:px-6 py-4 min-w-[180px]">
                        <div className="font-semibold text-foreground text-sm tracking-tight leading-snug">
                          {lead.company_name || lead.contact_person}
                        </div>
                        {lead.contact_person && lead.contact_person !== lead.company_name && (
                          <div className="text-xs text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
                            {lead.contact_person}
                          </div>
                        )}
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
                      <td className="px-6 py-4 text-sm text-foreground" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                           {lead.website && (
                             <a href={formatUrl(lead.website)} target="_blank" rel="noopener noreferrer" 
                                className="p-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 group/link"
                                title="Visit Website">
                                <Globe size={14} className="group-hover/link:rotate-12 transition-transform" />
                             </a>
                           )}
                           {lead.external_link && (
                             <a href={formatUrl(lead.external_link)} target="_blank" rel="noopener noreferrer" 
                                className="p-2 bg-rose-600/10 border border-rose-500/30 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 group/link"
                                title="Google Maps">
                                <MapPin size={14} className="group-hover/link:-translate-y-0.5 transition-transform" />
                             </a>
                           )}
                           {!lead.website && !lead.external_link && <span className="text-muted-foreground/30">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${STAGE_COLORS[lead.status] || 'bg-gray-500'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">₹{(lead.estimated_value || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                    {/* Expandable details panel */}
                    {isExpanded && (
                      <tr className="bg-muted/15 border-b border-border">
                        <td colSpan={10} className="p-6 md:p-8">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-foreground">
                            
                            {/* Panel Column 1: Financial & Core Info */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Financial Summary</h4>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Estimated Value:</span>
                                <span className="font-bold">₹{(lead.estimated_value || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Lead Budget:</span>
                                <span className="font-bold">₹{(lead.budget || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Amount Paid:</span>
                                <span className="font-bold text-emerald-500">₹{(lead.amount_paid || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Payment Status:</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                                  lead.payment_status === 'Paid' || lead.payment_status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                  lead.payment_status === 'Partial' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                  'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                  {lead.payment_status || 'Pending'}
                                </span>
                              </div>
                            </div>

                            {/* Panel Column 2: Lead Metadata */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Lead Metadata</h4>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Source:</span>
                                <span className="font-bold">{lead.source || 'Manual Entry'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Created At:</span>
                                <span className="font-bold">{new Date(lead.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Follow-Up Date:</span>
                                <span className="font-bold text-amber-500">
                                  {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'None'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Tags:</span>
                                <span className="font-bold">{lead.tags || '—'}</span>
                              </div>
                            </div>

                            {/* Panel Column 3: Notes & Custom Fields */}
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Interaction Notes</h4>
                              <div className="p-3 bg-background border border-border/50 rounded-xl max-h-[120px] overflow-y-auto text-xs text-muted-foreground">
                                {lead.notes ? (
                                  <p className="whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                                ) : (
                                  <p className="italic opacity-60">No notes recorded.</p>
                                )}
                              </div>
                              
                              {/* Custom Fields from CSV */}
                              {lead.custom_data && Object.keys(lead.custom_data).length > 0 && (
                                <div className="mt-3">
                                  <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Additional CSV Data</h4>
                                  <div className="grid grid-cols-2 gap-2 text-[11px] max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {Object.entries(lead.custom_data).map(([k, v]) => (
                                      <div key={k} className="p-1.5 bg-background border border-border/30 rounded-lg truncate">
                                        <span className="text-muted-foreground font-semibold block uppercase text-[8px] tracking-wider truncate">{k}</span>
                                        <span className="font-bold text-foreground truncate block">{String(v || '—')}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lead Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-500">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/30">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{isEditMode ? 'Update Details' : 'Add to CRM'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-background rounded-2xl transition-colors text-muted-foreground bg-background/50"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
              
              {/* Company & Contact */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Person / Name</label>
                  <input 
                    type="text" 
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma (falls back to Company Name)"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="contact@company.com"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              {/* Service Interest & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Service Interest</label>
                  <input 
                    type="text" 
                    value={formData.service_interest}
                    onChange={(e) => setFormData({...formData, service_interest: e.target.value})}
                    placeholder="e.g. Web Development, SEO"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Lead Source</label>
                  <input 
                    type="text" 
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    placeholder="e.g. Website, Referral, Cold Call"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              {/* Website & Google Maps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website Link</label>
                  <input 
                    type="text" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="techflow.io"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Google Maps Link</label>
                  <input 
                    type="text" 
                    value={formData.external_link}
                    onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              {/* Financial Inputs: Estimated Value & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estimated Value (₹)</label>
                  <input 
                    type="text" 
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                    placeholder="Enter amount..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Client Budget (₹)</label>
                  <input 
                    type="text" 
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    placeholder="Enter budget..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold" 
                  />
                </div>
              </div>

              {/* Payment Details: Payment Status & Amount Paid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Payment Status</label>
                  <select 
                    value={formData.payment_status}
                    onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="Pending" className="bg-background text-foreground">Pending</option>
                    <option value="Partial" className="bg-background text-foreground">Partial</option>
                    <option value="Paid" className="bg-background text-foreground">Paid</option>
                    <option value="Completed" className="bg-background text-foreground">Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Amount Paid (₹)</label>
                  <input 
                    type="text" 
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({...formData, amount_paid: e.target.value})}
                    placeholder="Enter amount paid..."
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold" 
                  />
                </div>
              </div>

              {/* Owner Assignment */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Assigned Owner / Salesperson</label>
                <select 
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium appearance-none cursor-pointer"
                >
                  <option value="" className="bg-background text-foreground">Select a salesperson...</option>
                  {workspaceUsers.map(u => (
                    <option key={u.id} value={u.id} className="bg-background text-foreground">
                      {u.full_name || u.username} {u.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interaction Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">General Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Record discussions, demands or comments..."
                  rows={3}
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium custom-scrollbar" 
                />
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
