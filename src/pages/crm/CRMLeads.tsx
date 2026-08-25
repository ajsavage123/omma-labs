import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceUsers } from "@/hooks/useWorkspaceUsers";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2, Trash2, Edit2, Download, Upload, Globe, MapPin, ChevronDown, ChevronUp, Zap, Flame, Snowflake, AlertTriangle, CheckSquare, History, RotateCcw, FileSpreadsheet, Layers } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/useToast";
import { useCRMData } from "@/contexts/CRMDataContext";
import { useLeadScoring } from "@/hooks/useLeadScoring";
import { formatUrl } from "../../utils/formatUrl";
import CRMDuplicateLeadsModal from "@/components/crm/CRMDuplicateLeadsModal";
import { findDuplicateLeads } from "@/utils/crmDuplicateFinder";

const STAGE_COLORS: Record<string, string> = {
  'New Leads': 'bg-blue-500',
  'Contacted': 'bg-cyan-500',
  'Not Interested': 'bg-rose-500',
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
  const { leads, allLeads, activities, tasks, loading, refreshLeads, crmViewMode } = useCRMData();
  const scoredLeads = useLeadScoring(leads, activities, tasks);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Multi-Select Leads State & Helper Functions
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Traditional CRM Import History & View Tabs State
  const [isImportHistoryOpen, setIsImportHistoryOpen] = useState(false);
  const [rollingBackBatchId, setRollingBackBatchId] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'mine' | 'recent_imports' | 'active'>('all');

  // Compute Import Batches from workspace leads
  const importBatches = React.useMemo(() => {
    const batchesMap = new Map<string, {
      batchId: string;
      filename: string;
      importedAt: string;
      leadsCount: number;
      leadIds: string[];
    }>();

    (allLeads || []).forEach(l => {
      const batchId = l.custom_data?.import_batch_id || (l.source && l.source.includes('CSV') ? `legacy_${l.source}` : null);
      if (!batchId) return;

      if (!batchesMap.has(batchId)) {
        batchesMap.set(batchId, {
          batchId,
          filename: l.custom_data?.import_filename || l.source || 'CSV Import',
          importedAt: l.custom_data?.imported_at || l.created_at,
          leadsCount: 0,
          leadIds: []
        });
      }

      const b = batchesMap.get(batchId)!;
      b.leadsCount++;
      b.leadIds.push(l.id);
    });

    return Array.from(batchesMap.values()).sort((a, b) => 
      new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
    );
  }, [allLeads]);

  const handleRollbackImportBatch = async (batchId: string, filename: string, leadIds: string[]) => {
    if (!window.confirm(`Undo and Rollback Import Batch "${filename}"?\n\nThis will permanently delete all ${leadIds.length} lead(s) created during this import batch without touching your other leads.`)) {
      return;
    }

    setRollingBackBatchId(batchId);
    try {
      const batchSize = 200;
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        const { error } = await supabase.from('crm_leads').delete().in('id', batch);
        if (error) throw error;
      }
      toast.success(`Rolled back import "${filename}". ${leadIds.length} lead(s) deleted.`);
      setSelectedLeadIds([]);
      refreshLeads();
    } catch (err: any) {
      toast.error("Failed to rollback import batch");
      console.error(err);
    } finally {
      setRollingBackBatchId(null);
    }
  };

  // Duplicate leads state (respects active My CRM vs Team CRM toggle)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const duplicateAnalysis = React.useMemo(() => {
    const activeLeadsScope = crmViewMode === 'mine' ? leads : (allLeads || leads);
    return findDuplicateLeads(activeLeadsScope || []);
  }, [crmViewMode, leads, allLeads]);
  
  // Advanced Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'all' | 'mine' | 'partner' | 'selected' | 'new_imported'>('selected');
  const [deleteTargetPartnerId, setDeleteTargetPartnerId] = useState('');
  const { users } = useWorkspaceUsers();
  
  // Include only CRM-authorized workspace users (admin or Business/Marketing designation) in the owner dropdown.
  // Always ensure the current user (admin) appears even if not in the team list.
  const workspaceUsers = (() => {
    const filteredList = users.filter(u => {
      // Exclude placeholder system admin accounts unless it is the logged-in user
      const isSystemAdminPlaceholder = ['admin', 'oomadmin'].includes(u.username?.toLowerCase()) && u.id !== user?.id;
      if (isSystemAdminPlaceholder) return false;

      const isUserAdmin = u.role === 'admin';
      const isUserBusinessMarketing = (u.designation || '').toLowerCase().includes('business') ||
                                      (u.designation || '').toLowerCase().includes('marketing');
      return isUserAdmin || isUserBusinessMarketing;
    });

    const list = filteredList.filter(u => u.id !== user?.id); // all except current user
    const currentUserObj = users.find(u => u.id === user?.id);
    if (currentUserObj) {
      return [currentUserObj, ...list]; // current user first
    }
    return list;
  })();
  
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  // Smart Filters State
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMinValue, setFilterMinValue] = useState("");
  const [filterDate, setFilterDate] = useState("All");
  const [filterSortBy, setFilterSortBy] = useState("Newest");

  // Role check: admin sees all, all non-admins see only their own assigned leads
  const isAdmin = user?.role === 'admin';
  const isSalesperson = !isAdmin;
  
  // Lead Form State
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    email: '',
    phone: '',
    estimated_value: '',
    service_interest: '',
    business_type: '',
    website: '',
    external_link: '',
    assigned_to: '',
    budget: '',
    source: '',
    payment_status: 'Pending',
    amount_paid: '',
    notes: ''
  });


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
      business_type: '',
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

  const openEditModal = (lead: Record<string, any>) => {
    setIsEditMode(true);
    setEditingLeadId(lead.id);
    setFormData({
      contact_person: lead.contact_person || '',
      company_name: lead.company_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: lead.estimated_value === 0 ? '' : (lead.estimated_value || '').toString(),
      service_interest: lead.service_interest || '',
      business_type: lead.business_type || '',
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
      const finalCompany = formData.company_name.trim();
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
        business_type: formData.business_type.trim() || null,
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

  // Multi-Select Helpers
  const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectNewImportedLeads = () => {
    // Select leads matching CSV source or in 'New Leads' stage
    const newImported = filteredLeads.filter(l => 
      (l.source && l.source.toLowerCase().includes('csv')) || l.status === 'New Leads'
    );
    const ids = newImported.map(l => l.id);
    if (ids.length === 0) {
      toast.info("No newly imported or 'New Leads' stage records found in current view");
      return;
    }
    setSelectedLeadIds(ids);
    toast.success(`Selected ${ids.length} newly imported / new lead(s)`);
  };

  const clearSelection = () => {
    setSelectedLeadIds([]);
  };

  const confirmAdvancedDelete = async () => {
    try {
      setSubmitting(true);
      
      if (deleteTarget === 'selected') {
        if (selectedLeadIds.length === 0) {
          toast.error("No leads selected for deletion.");
          return;
        }
        const batchSize = 200;
        for (let i = 0; i < selectedLeadIds.length; i += batchSize) {
          const batch = selectedLeadIds.slice(i, i + batchSize);
          const { error } = await supabase.from('crm_leads').delete().in('id', batch);
          if (error) throw error;
        }
        toast.success(`Successfully deleted ${selectedLeadIds.length} selected lead(s)`);
        setSelectedLeadIds([]);
      } else if (deleteTarget === 'new_imported') {
        const targetLeads = filteredLeads.filter(l => 
          (l.source && l.source.toLowerCase().includes('csv')) || l.status === 'New Leads'
        );
        const targetIds = targetLeads.map(l => l.id);
        if (targetIds.length === 0) {
          toast.info("No newly imported leads found to delete");
          return;
        }
        const batchSize = 200;
        for (let i = 0; i < targetIds.length; i += batchSize) {
          const batch = targetIds.slice(i, i + batchSize);
          const { error } = await supabase.from('crm_leads').delete().in('id', batch);
          if (error) throw error;
        }
        toast.success(`Successfully deleted ${targetIds.length} newly imported lead(s)`);
        setSelectedLeadIds([]);
      } else {
        let query = supabase.from('crm_leads').delete();
        
        if (isAdmin) {
          if (deleteTarget === 'all') {
            query = query.eq('workspace_id', user.workspace_id);
          } else if (deleteTarget === 'partner') {
            if (!deleteTargetPartnerId) return toast.error("Please select a partner first.");
            query = query.eq('assigned_to', deleteTargetPartnerId);
          } else if (deleteTarget === 'mine') {
            query = query.eq('assigned_to', user?.id);
          }
        } else {
          query = query.eq('assigned_to', user?.id);
        }

        const { error } = await query;
        if (error) throw error;
        toast.success("Leads deleted successfully");
        setSelectedLeadIds([]);
      }
      
      setIsDeleteModalOpen(false);
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete leads");
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

    const importBatchId = `batch_${Date.now()}`;
    const importFilename = file.name;
    const importTimestamp = new Date().toISOString();
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const newLeads = (results.data as Record<string, any>[]).map((row) => {
            const matchedKeys: string[] = [];
            const getField = (keys: string[]) => {
              const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
              if (key) {
                matchedKeys.push(key.toLowerCase().trim());
                return row[key];
              }
              return null;
            };

            // Smart mapping fallbacks:
            let name = getField(['name', 'contact name', 'contact_person', 'person', 'contact person']);
            let company = getField(['company', 'company name', 'business', 'company_name']);
            const email = getField(['email', 'email address', 'email_address']);
            const phone = getField(['phone', 'mobile', 'contact number', 'phone number']);
            const value = parseFloat(getField(['value', 'estimated value', 'amount', 'revenue', 'estimated_value'])?.replace(/[^0-9.]/g, '') || '0');
            const budget = parseFloat(getField(['budget', 'estimated budget'])?.replace(/[^0-9.]/g, '') || '0');
            const status = getField(['status', 'stage', 'lead status']) || 'New Leads';
            const website = getField(['website', 'url', 'link', 'website link', 'website url', 'website_url', 'web url', 'weblink']);
            const businessType = getField(['business category', 'category', 'business type', 'business_type', 'industry', 'type']);

            let location = getField([
              'google map link', 'google maps link', 'google maps url', 'google map url', 
              'maps url', 'map url', 'maps link', 'map link', 'external_link',
              'google maps', 'google map'
            ]);
            if (!location) {
              location = getField(['location', 'address', 'map', 'maps', 'location link', 'address link']);
            }

            const service = getField(['service', 'service interest', 'interest', 'service_interest']);
            const source = getField(['source', 'lead source']) || `CSV Import (${importFilename})`;
            const notes = getField(['notes', 'comment', 'description']);
            const paymentStatus = getField(['payment status', 'payment_status']) || 'Pending';
            const amountPaid = parseFloat(getField(['amount paid', 'amount_paid'])?.replace(/[^0-9.]/g, '') || '0');
            
            name = name ? name.trim() : '';
            company = company ? company.trim() : '';
            if (company && !name) {
              name = company;
            } else if (name && !company) {
              company = name;
            }

            if (!name) name = 'Unknown Contact';
            if (!company) company = 'Unknown Company';

            const csvOwner = getField(['owner', 'salesperson', 'assigned to', 'assigned_to', 'assignee', 'agent', 'staff', 'creator']);
            let assignedUserId = user?.id || null;
            if (csvOwner) {
              const cleanOwner = csvOwner.toString().trim().toLowerCase();
              const matchedUser = users.find(u => 
                (u.username || '').toLowerCase() === cleanOwner || 
                (u.full_name || '').toLowerCase() === cleanOwner
              );
              if (matchedUser) {
                assignedUserId = matchedUser.id;
              }
            }

            const customData: Record<string, any> = {
              import_batch_id: importBatchId,
              import_filename: importFilename,
              imported_at: importTimestamp
            };

            Object.keys(row).forEach(k => {
              const cleanedK = k.toLowerCase().trim();
              if (!matchedKeys.includes(cleanedK)) {
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
              business_type: businessType || null,
              service_interest: service || null,
              source: source,
              notes: notes || null,
              payment_status: paymentStatus,
              amount_paid: amountPaid,
              custom_data: customData,
              workspace_id: user?.workspace_id,
              assigned_to: assignedUserId
            };
          });

          // Pre-Import Deduplication: Filter out records that already exist in DB or within CSV file
          const existingEmails = new Set(
            (allLeads || []).map(l => (l.email || '').trim().toLowerCase()).filter(e => e && e !== 'none' && e.includes('@'))
          );
          const existingPhones = new Set(
            (allLeads || []).map(l => (l.phone || '').replace(/\D/g, '').slice(-10)).filter(p => p.length >= 7)
          );

          const uniqueLeadsToInsert: typeof newLeads = [];
          const seenCsvEmails = new Set<string>();
          const seenCsvPhones = new Set<string>();
          let skippedDuplicatesCount = 0;

          for (const lead of newLeads) {
            const normEmail = (lead.email || '').trim().toLowerCase();
            const normPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);

            const isDuplicateEmail = Boolean(normEmail && normEmail.includes('@') && (existingEmails.has(normEmail) || seenCsvEmails.has(normEmail)));
            const isDuplicatePhone = Boolean(normPhone && normPhone.length >= 7 && (existingPhones.has(normPhone) || seenCsvPhones.has(normPhone)));

            if (isDuplicateEmail || isDuplicatePhone) {
              skippedDuplicatesCount++;
              continue;
            }

            if (normEmail && normEmail.includes('@')) seenCsvEmails.add(normEmail);
            if (normPhone && normPhone.length >= 7) seenCsvPhones.add(normPhone);
            uniqueLeadsToInsert.push(lead);
          }

          if (uniqueLeadsToInsert.length === 0) {
            toast.info(`Import skipped: All ${newLeads.length} leads in the file already exist in your workspace database.`);
            return;
          }

          // Batch insert unique leads
          const batchSize = 500;
          for (let i = 0; i < uniqueLeadsToInsert.length; i += batchSize) {
            const batch = uniqueLeadsToInsert.slice(i, i + batchSize);
            const { error } = await supabase.from('crm_leads').insert(batch);
            if (error) throw error;
          }
          
          if (skippedDuplicatesCount > 0) {
            toast.success(`Successfully imported ${uniqueLeadsToInsert.length} new lead(s). (${skippedDuplicatesCount} duplicate(s) automatically skipped)`);
          } else {
            toast.success(`Successfully imported ${uniqueLeadsToInsert.length} lead(s)`);
          }

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

  const filteredLeads = scoredLeads.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    
    const matchesSearch = !q || 
      (l.company_name || '').toLowerCase().includes(q) || 
      (l.contact_person || '').toLowerCase().includes(q) || 
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.status || '').toLowerCase().includes(q) ||
      (l.service_interest || '').toLowerCase().includes(q) ||
      (q === 'unassigned' && !l.assigned_to) ||
      (l.assigned_user?.full_name || '').toLowerCase().includes(q) ||
      (l.assigned_user?.username || '').toLowerCase().includes(q);

    const leadStatus = (l.status || '').toLowerCase();
    const targetStatus = filterStatus.toLowerCase();
    const matchesStatus = filterStatus === "All" || 
      leadStatus === targetStatus ||
      (targetStatus.includes('new') && leadStatus.includes('new')) ||
      (targetStatus.includes('won') && leadStatus.includes('won'));

    const minVal = parseFloat(filterMinValue);
    const matchesValue = isNaN(minVal) || (l.estimated_value || 0) >= minVal;
    
    let matchesDate = true;
    if (filterDate === "Last 7 Days") {
      matchesDate = Boolean(l.created_at) && new Date(l.created_at).getTime() >= (Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (filterDate === "Last 30 Days") {
      matchesDate = Boolean(l.created_at) && new Date(l.created_at).getTime() >= (Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    let matchesTab = true;
    if (activeViewTab === 'mine') {
      matchesTab = l.assigned_to === user?.id;
    } else if (activeViewTab === 'recent_imports') {
      matchesTab = Boolean(
        l.custom_data?.import_batch_id || 
        (l.source && l.source.toLowerCase().includes('csv'))
      );
    } else if (activeViewTab === 'active') {
      matchesTab = !['won', 'won (converted)', 'lost', 'not interested'].includes(leadStatus);
    }

    return matchesSearch && matchesStatus && matchesValue && matchesDate && matchesTab &&
      (!isSalesperson || l.assigned_to === user?.id);
  }).sort((a, b) => {
    if (filterSortBy === "Score (High-Low)") {
      return (b.propensityScore || 0) - (a.propensityScore || 0);
    } else if (filterSortBy === "Newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return 0;
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
        <div className="flex items-center gap-2">
          {duplicateAnalysis.totalGroupCount > 0 && (
            <Button
              onClick={() => setIsDuplicateModalOpen(true)}
              variant="outline"
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold text-xs gap-1.5 shadow-sm"
            >
              <AlertTriangle size={15} />
              <span>Duplicates ({duplicateAnalysis.totalGroupCount})</span>
            </Button>
          )}
          <Button 
            onClick={openAddModal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Add Lead</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Action Bar: Owner filter + bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {/* Salesperson / Partner Badge */}
          {isSalesperson && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl whitespace-nowrap">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">My Leads</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button 
            variant="outline"
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={importing}
            className="border-primary/20 hover:bg-primary/10 text-primary transition-all px-2.5 sm:px-4 h-9 font-semibold text-xs"
          >
            {importing ? <Loader2 size={14} className="animate-spin sm:mr-1.5" /> : <Download size={14} className="sm:mr-1.5" />}
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsImportHistoryOpen(true)}
            className="border-primary/20 hover:bg-primary/10 text-primary transition-all px-2.5 sm:px-4 h-9 font-semibold text-xs gap-1.5"
          >
            <History size={14} />
            <span className="hidden sm:inline">Import History</span>
            {importBatches.length > 0 && (
              <span className="px-1.5 py-0.2 bg-primary/20 text-primary rounded-full text-[10px] font-bold">
                {importBatches.length}
              </span>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            className="border-primary/20 hover:bg-primary/10 text-primary transition-all px-2.5 sm:px-4 h-9 font-semibold text-xs"
          >
            <Upload size={14} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={submitting}
            className="border-rose-500/20 hover:bg-rose-500/10 text-rose-500 transition-all px-2.5 sm:px-4 h-9 font-semibold text-xs"
          >
            <Trash2 size={14} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Delete Leads</span>
          </Button>
        </div>
      </div>

      {/* Traditional CRM View Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveViewTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeViewTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Layers size={13} /> All Leads
        </button>
        <button
          onClick={() => setActiveViewTab('mine')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeViewTab === 'mine'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          My Assigned
        </button>
        <button
          onClick={() => setActiveViewTab('recent_imports')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeViewTab === 'recent_imports'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <FileSpreadsheet size={13} /> Recent CSV Imports
        </button>
        <button
          onClick={() => setActiveViewTab('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeViewTab === 'active'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Zap size={13} /> Active Pipeline
        </button>
      </div>

      {/* Enterprise Bulk Action Bar (Visible ONLY when 1+ rows are checked) */}
      {selectedLeadIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-primary/10 border border-primary/30 rounded-2xl shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="h-6 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {selectedLeadIds.length} Selected
            </span>
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Selected rows in current view
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Deselect All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setDeleteTarget('selected');
                setIsDeleteModalOpen(true);
              }}
              className="h-8 text-xs font-bold gap-1.5 bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
            >
              <Trash2 size={13} /> Delete Selected ({selectedLeadIds.length})
            </Button>
          </div>
        </div>
      )}

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
          <select 
            value={filterSortBy}
            onChange={(e) => setFilterSortBy(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none appearance-none font-bold cursor-pointer whitespace-nowrap"
          >
            <option value="Newest" className="bg-background text-foreground">Sort: Newest</option>
            <option value="Score (High-Low)" className="bg-background text-foreground">Sort: Score</option>
          </select>
        </div>
      </div>

      {/* Multi-Select Quick Selection Toolbar & Sticky Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={selectNewImportedLeads}
            className="h-8 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-all"
          >
            <Download size={13} /> Select Newly Imported Leads
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedLeadIds.length === filteredLeads.length) {
                setSelectedLeadIds([]);
              } else {
                setSelectedLeadIds(filteredLeads.map(l => l.id));
              }
            }}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <CheckSquare size={13} />
            {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0
              ? "Deselect All"
              : `Select All (${filteredLeads.length})`}
          </Button>
          {selectedLeadIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Clear ({selectedLeadIds.length})
            </Button>
          )}
        </div>

        {selectedLeadIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
              {selectedLeadIds.length} Selected
            </span>
            <Button
              size="sm"
              onClick={() => {
                setDeleteTarget('selected');
                setIsDeleteModalOpen(true);
              }}
              className="h-8 text-xs font-bold gap-1.5 bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
            >
              <Trash2 size={13} /> Delete Selected ({selectedLeadIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden rounded-2xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="w-10 pl-3 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeadIds(filteredLeads.map(l => l.id));
                      } else {
                        setSelectedLeadIds([]);
                      }
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    title="Select All Leads"
                  />
                </th>
                <th className="w-8"></th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Company & Contact</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phone</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score</th>
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
                      className={`border-b border-border transition-colors cursor-pointer ${
                        selectedLeadIds.includes(lead.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-background/40'
                      }`}
                      onClick={() => setExpandedRowId(isExpanded ? null : lead.id)}
                    >
                      <td className="pl-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={(e) => toggleSelectLead(lead.id, e as any)}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="pr-2 text-center">
                        {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </td>
                       <td className="px-4 lg:px-6 py-4 min-w-[280px] break-words">
                        <div className="font-semibold text-foreground text-sm tracking-tight leading-snug flex flex-wrap items-center gap-1.5">
                          {lead.company_name || lead.contact_person}
                          {lead.business_type && (
                            <span className="px-1.5 py-0.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black rounded-lg uppercase tracking-wider">
                              {lead.business_type}
                            </span>
                          )}
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
                      <td className="px-6 py-4 text-sm">
                        {lead.propensityScore !== undefined && (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-bold ${
                            lead.propensityScore >= 75 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            lead.propensityScore >= 40 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}>
                            {lead.propensityScore >= 75 ? <Flame size={12} /> : 
                             lead.propensityScore >= 40 ? <Zap size={12} /> : 
                             <Snowflake size={12} />}
                            {lead.propensityScore}
                          </div>
                        )}
                      </td>
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
                                <Globe size={18} className="group-hover/link:rotate-12 transition-transform" />
                             </a>
                           )}
                           {lead.external_link && (
                             <a href={formatUrl(lead.external_link)} target="_blank" rel="noopener noreferrer" 
                                className="p-2 bg-rose-600/10 border border-rose-500/30 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 group/link"
                                title="Google Maps">
                                <MapPin size={18} className="group-hover/link:-translate-y-0.5 transition-transform" />
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
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Business Category:</span>
                                <span className="font-bold">{lead.business_type || '—'}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Website:</span>
                                <span className="font-bold">
                                  {lead.website ? (
                                    <a href={formatUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                      <Globe size={12} /> {lead.website}
                                    </a>
                                  ) : '—'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-border/50">
                                <span className="text-muted-foreground font-medium">Maps Link/Address:</span>
                                <span className="font-bold max-w-[140px] truncate block" title={lead.external_link || ''}>
                                  {lead.external_link ? (
                                    <a href={formatUrl(lead.external_link)} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline flex items-center gap-1">
                                      <MapPin size={12} /> View Map
                                    </a>
                                  ) : '—'}
                                </span>
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

              {/* Business Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Business Category / Type</label>
                  <input 
                    type="text" 
                    value={formData.business_type}
                    onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                    placeholder="e.g. Gym, Salon, Restaurant, Electrician"
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
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Google Maps Link / Address</label>
                  <input 
                    type="text" 
                    value={formData.external_link}
                    onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                    placeholder="https://maps.google.com/... or 123 Main St"
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
      {/* Advanced Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="text-rose-500" size={20} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Delete Leads</h2>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Select which leads you would like to permanently delete:</p>
              
              <div className="space-y-2.5">
                {/* Option 1: Delete Checked / Selected Leads */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                  <input 
                    type="radio" 
                    name="deleteTarget" 
                    checked={deleteTarget === 'selected'} 
                    onChange={() => setDeleteTarget('selected')}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-foreground block">
                      Delete Checked / Selected Leads ({selectedLeadIds.length})
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Deletes only the {selectedLeadIds.length} lead(s) you individually checked.
                    </span>
                  </div>
                </label>

                {/* Option 2: Delete Newly Imported / CSV Leads */}
                <label className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
                  <input 
                    type="radio" 
                    name="deleteTarget" 
                    checked={deleteTarget === 'new_imported'} 
                    onChange={() => setDeleteTarget('new_imported')}
                    className="text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300 block">
                      Delete Newly Imported / CSV Leads
                    </span>
                    <span className="text-xs text-amber-600/80 dark:text-amber-400/80 block">
                      Safely deletes CSV imports and "New Leads" without touching active leads in progress.
                    </span>
                  </div>
                </label>

                {isAdmin ? (
                  <>
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                      <input 
                        type="radio" 
                        name="deleteTarget" 
                        checked={deleteTarget === 'mine'} 
                        onChange={() => setDeleteTarget('mine')}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="text-sm font-medium">Delete Only My Assigned Leads</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                      <input 
                        type="radio" 
                        name="deleteTarget" 
                        checked={deleteTarget === 'partner'} 
                        onChange={() => setDeleteTarget('partner')}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium block mb-1">Delete Partner's Leads</span>
                        {deleteTarget === 'partner' && (
                          <select 
                            className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm"
                            value={deleteTargetPartnerId}
                            onChange={(e) => setDeleteTargetPartnerId(e.target.value)}
                          >
                            <option value="">Select a partner...</option>
                            {users.filter(u => u.id !== user?.id && !['admin', 'oomadmin'].includes(u.username?.toLowerCase() || '')).map(u => (
                              <option key={u.id} value={u.id}>{u.full_name || u.email || u.username}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-colors">
                      <input 
                        type="radio" 
                        name="deleteTarget" 
                        checked={deleteTarget === 'all'} 
                        onChange={() => setDeleteTarget('all')}
                        className="text-rose-500 focus:ring-rose-500 h-4 w-4"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-rose-500">Delete ALL Workspace Leads</span>
                        <span className="text-xs text-rose-500/80 block">Warning: Permanently wipes all workspace leads.</span>
                      </div>
                    </label>
                  </>
                ) : (
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-colors">
                    <input 
                      type="radio" 
                      name="deleteTarget" 
                      checked={deleteTarget === 'mine'} 
                      onChange={() => setDeleteTarget('mine')}
                      className="text-rose-500 focus:ring-rose-500 h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-bold text-rose-500">Delete All My Leads</span>
                      <span className="text-xs text-rose-500/80 block">Warning: Permanently deletes all leads assigned to you.</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmAdvancedDelete}
                disabled={submitting || (isAdmin && deleteTarget === 'partner' && !deleteTargetPartnerId)}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Traditional CRM Import History & Rollback Modal */}
      {isImportHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border p-6 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <History size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Import History & Rollback</h2>
                  <p className="text-xs text-muted-foreground">
                    View past CSV import batches and rollback any batch without affecting other leads
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsImportHistoryOpen(false)}
                className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Import Batches List */}
            <div className="py-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {importBatches.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <FileSpreadsheet size={36} className="mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No CSV Import History Found</p>
                  <p className="text-xs max-w-sm mx-auto">
                    When you import CSV lead files, each batch is automatically logged here so you can undo any import in 1 click.
                  </p>
                </div>
              ) : (
                importBatches.map(batch => (
                  <div 
                    key={batch.batchId} 
                    className="bg-background border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-border transition-colors"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-primary shrink-0" />
                        <span className="text-sm font-bold text-foreground truncate">{batch.filename}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-bold shrink-0">
                          {batch.leadsCount} lead(s)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Imported on {new Date(batch.importedAt).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={rollingBackBatchId === batch.batchId}
                      onClick={() => handleRollbackImportBatch(batch.batchId, batch.filename, batch.leadIds)}
                      className="h-8 text-xs font-bold gap-1.5 shrink-0 bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                    >
                      {rollingBackBatchId === batch.batchId ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      Undo Import ({batch.leadsCount})
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-border flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsImportHistoryOpen(false)}
                className="h-8 text-xs font-medium px-4"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Duplicate Leads Manager Modal */}
      <CRMDuplicateLeadsModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
      />

    </div>
  );
}
