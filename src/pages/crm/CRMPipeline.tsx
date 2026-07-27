import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, ChevronRight, ChevronLeft, Plus, Loader2, X, HelpCircle, Trash2, Edit2, Pin, Clock, Globe, MapPin, Clipboard, Search, Calendar } from "lucide-react";

import { useWorkspaceUsers } from '@/hooks/useWorkspaceUsers';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';
import { useCRMData } from '@/contexts/CRMDataContext';
import { formatUrl } from '../../utils/formatUrl';
import { googleCalendarService } from '@/services/googleCalendarService';
import { notificationService } from '@/utils/notificationService';

const STAGES = [
  { 
    name: "New Leads", 
    key: 'New Leads', 
    color: 'from-blue-500 to-blue-700',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-500',
    description: "Incoming prospects who haven't been qualified yet.",
    aliases: ['New', 'new', 'NEW_LEAD']
  },
  { 
    name: "Contacted", 
    key: 'Contacted', 
    color: 'from-cyan-500 to-cyan-700',
    borderColor: 'border-cyan-500/20',
    textColor: 'text-cyan-500',
    description: "Initial reach-out performed via email or call.",
    aliases: ['contacted', 'CONTACTED']
  },
  { 
    name: "Not Interested", 
    key: 'Not Interested', 
    color: 'from-rose-500 to-rose-700',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-500',
    description: "Prospect contacted but not interested.",
    aliases: ['Not Interested', 'not_interested', 'NOT_INTERESTED', 'Lost', 'lost', 'LOST', 'Rejected']
  },
  { 
    name: "Interested", 
    key: 'Interested', 
    color: 'from-amber-500 to-amber-700',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-500',
    description: "Prospect has responded and shown active interest.",
    aliases: ['interested', 'INTERESTED']
  },
  { 
    name: "Proposal Sent", 
    key: 'Proposal Sent', 
    color: 'from-indigo-500 to-indigo-700',
    borderColor: 'border-indigo-500/20',
    textColor: 'text-indigo-500',
    description: "A formal proposal or price quote has been sent.",
    aliases: ['Proposal', 'Quotation', 'PROPOSAL_SENT']
  },
  { 
    name: "Negotiation", 
    key: 'Negotiation', 
    color: 'from-purple-500 to-purple-700',
    borderColor: 'border-purple-500/20',
    textColor: 'text-purple-500',
    description: "Discussing final terms or pricing adjustments.",
    aliases: ['negotiation', 'NEGOTIATING']
  },
  { 
    name: "Won (Converted)", 
    key: 'Won (Converted)', 
    color: 'from-emerald-500 to-emerald-700',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-500',
    description: "Success! Deal closed or payment received.",
    aliases: ['Won', 'WON', 'Converted', 'CONVERTED']
  },
];


export default function CRMPipeline() {
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  const [searchParams] = useSearchParams();
  const { leads, loading, refreshLeads } = useCRMData();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hasPendingTasks = leads.some(lead => 
      lead.crm_tasks?.some((t: any) => t.status === 'Pending')
    );
    if (!hasPendingTasks) return;

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // refresh every 15s to update card highlighting
    return () => clearInterval(timer);
  }, [leads]);

  const getLeadHighlightClass = (lead: any) => {
    if (!lead.crm_tasks || lead.crm_tasks.length === 0) return '';
    
    let urgency: 'red' | 'orange' | 'blue' | null = null;
    
    lead.crm_tasks.forEach((task: any) => {
      if (task.status !== 'Pending') return;
      
      let dueDate = new Date(task.due_date);
      if (task.due_time) {
        const [hours, minutes] = task.due_time.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      const diffMs = dueDate.getTime() - currentTime.getTime();
      
      if (diffMs < 0) {
        urgency = 'red'; // Overdue
      } else if (diffMs <= 5 * 60 * 1000) {
        if (urgency !== 'red') urgency = 'orange'; // Due in <= 5 mins
      } else if (diffMs <= 10 * 60 * 1000) {
        if (urgency !== 'red' && urgency !== 'orange') urgency = 'blue'; // Due in 5 to 10 mins
      }
    });
    
    if (urgency === 'red') return 'blink-ring-red';
    if (urgency === 'orange') return 'blink-ring-orange';
    if (urgency === 'blue') return 'blink-ring-blue';
    return '';
  };
  
  // Note Logger state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedLeadForNote, setSelectedLeadForNote] = useState<any>(null);
  const [noteFormData, setNoteFormData] = useState({
    interaction_type: 'call',
    discussion_points: '',
    sentiment: 'Interested',
    next_steps: '',
    additional_notes: ''
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    task_type: 'call',
    custom_task_type: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    scheduled_ampm: 'AM',
    notes: '',
    lead_id: ''
  });
  
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInfoFor, setShowInfoFor] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
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

  const [filterSalesperson, setFilterSalesperson] = useState<string>("All");

  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [syncAccount, setSyncAccount] = useState("");
  const [attendeesInput, setAttendeesInput] = useState("");

  useEffect(() => {
    const accounts = googleCalendarService.getLinkedAccounts();
    setLinkedAccounts(accounts);
    if (accounts.length > 0) {
      setSyncAccount(accounts[0].email);
    }
  }, [isTaskModalOpen]);

  useEffect(() => {
    if (taskFormData.lead_id) {
      const selectedLead = leads.find(l => l.id === taskFormData.lead_id);
      if (selectedLead?.email) {
        setAttendeesInput(selectedLead.email);
      } else {
        setAttendeesInput("");
      }
    } else {
      setAttendeesInput("");
    }
  }, [taskFormData.lead_id, leads]);

  // Role check: admin/owner sees all, Business & Marketing sees only their own leads
  const isAdmin = user?.role === 'admin';
  const isBusinessMarketing = (user?.designation || '').toLowerCase().includes('business') || 
                               (user?.designation || '').toLowerCase().includes('marketing');
  const isSalesperson = !isAdmin && isBusinessMarketing;
  const [glowingLeadId, setGlowingLeadId] = useState<string | null>(null);

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
    assigned_to: ''
  });



  const togglePin = async (leadId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ is_pinned: !currentStatus })
        .eq('id', leadId);
      if (error) throw error;
      toast.success(!currentStatus ? "Pinned to top" : "Unpinned");
      refreshLeads();
    } catch (error) {
      toast.error("Failed to update pin");
      console.error(error);
    }
  };

  const openTaskModal = (lead: any) => {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const time12 = `${hours12.toString().padStart(2, '0')}:${minutes}`;

    setTaskFormData({
      title: `Follow up with ${lead.company_name || lead.contact_person}`,
      task_type: 'call',
      custom_task_type: '',
      scheduled_date: now.toISOString().split('T')[0],
      scheduled_time: time12,
      scheduled_ampm: ampm,
      notes: '',
      lead_id: lead.id
    });
    setIsTaskModalOpen(true);
  };

  const openNoteModal = (lead: any) => {
    setSelectedLeadForNote(lead);
    setNoteFormData({
      interaction_type: 'call',
      discussion_points: '',
      sentiment: 'Interested',
      next_steps: '',
      additional_notes: ''
    });
    setIsNoteModalOpen(true);
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForNote || !user) return;
    
    setSubmitting(true);
    try {
      const typeIcons: Record<string, string> = {
        call: '📞',
        email: '📧',
        meeting: '🤝',
        whatsapp: '💬'
      };
      
      const formattedNote = `${typeIcons[noteFormData.interaction_type] || '📝'} ${noteFormData.interaction_type.toUpperCase()} INTERACTION LOG
• Discussion Points: ${noteFormData.discussion_points.trim() || '—'}
• Client Sentiment: ${noteFormData.sentiment}
• Agreed Next Steps: ${noteFormData.next_steps.trim() || '—'}
${noteFormData.additional_notes.trim() ? `• Additional Details: ${noteFormData.additional_notes.trim()}` : ''}`;

      // Insert record into crm_activities
      const { error } = await supabase.from('crm_activities').insert([{
        lead_id: selectedLeadForNote.id,
        user_id: user.id,
        activity_type: 'note',
        description: formattedNote
      }]);

      if (error) throw error;

      // Update lead's main notes field for quick details list referencing
      const updatedNotes = selectedLeadForNote.notes 
        ? `${formattedNote}\n\n---\n\n${selectedLeadForNote.notes}`
        : formattedNote;

      const { error: leadErr } = await supabase
        .from('crm_leads')
        .update({ notes: updatedNotes })
        .eq('id', selectedLeadForNote.id);

      if (leadErr) throw leadErr;

      toast.success("Interaction note logged successfully!");
      setIsNoteModalOpen(false);
      refreshLeads();
    } catch (error) {
      toast.error("Failed to log interaction note");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskSubmitting(true);
    try {
      let [hours, minutes] = taskFormData.scheduled_time.split(':').map(Number);
      if (taskFormData.scheduled_ampm === 'PM' && hours < 12) hours += 12;
      if (taskFormData.scheduled_ampm === 'AM' && hours === 12) hours = 0;
      
      const dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      let finalTaskType = taskFormData.task_type;
      if (taskFormData.task_type === 'custom') {
        finalTaskType = taskFormData.custom_task_type.trim() || 'Custom Action';
      }

      const { data: insertedData, error } = await supabase
        .from('crm_tasks')
        .insert([{
          title: taskFormData.title,
          activity_type: finalTaskType === 'call' ? 'Call' : 
                         finalTaskType === 'email' ? 'Email' : 
                         finalTaskType === 'meeting' ? 'Meeting' : 
                         finalTaskType === 'quotation' ? 'Quotation' : 
                         finalTaskType,
          lead_id: taskFormData.lead_id,
          due_date: taskFormData.scheduled_date,
          due_time: dueTime,
          workspace_id: user?.workspace_id,
          assigned_to: user?.id,
          priority: 'Medium',
          status: 'Pending'
        }])
        .select('*, crm_leads(company_name, contact_person, email, phone)')
        .single();

      if (error) throw error;
      
      if (syncToGoogle && syncAccount && insertedData) {
        try {
          const listAttendees = attendeesInput ? attendeesInput.split(',').map(em => em.trim()) : [];
          await googleCalendarService.syncTask(insertedData, syncAccount, listAttendees);
          toast.success("Task synced with Google Calendar");
        } catch (e: any) {
          console.error("Google Calendar sync failed:", e);
          toast.error(`Calendar sync failed: ${e.message}`);
        }
      }

      toast.success(`Action scheduled successfully!`);
      if (taskFormData.lead_id) {
        setGlowingLeadId(taskFormData.lead_id);
        notificationService.playSound('success');
        notificationService.showNotification("Action Scheduled 🚀", {
          body: `Follow-up scheduled for lead: "${insertedData?.crm_leads?.company_name || insertedData?.crm_leads?.contact_person || 'Lead'}"`,
          tag: insertedData?.id || taskFormData.lead_id,
          silent: true,
          data: { url: '/crm/tasks' }
        });
        setTimeout(() => setGlowingLeadId(null), 4000);
      }
      setSyncToGoogle(false);
      setIsTaskModalOpen(false);
      refreshLeads();
    } catch (error) {
      toast.error("Failed to schedule action");
      console.error(error);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this scheduled action?")) return;
    try {
      // Delete from Google Calendar first
      await googleCalendarService.deleteTaskEvent(taskId);

      const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success("Action deleted");
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete action");
      console.error(error);
    }
  };

  const deleteRecentNote = async (lead: any) => {
    if (!confirm("Are you sure you want to delete the most recent note for this lead?")) return;
    try {
      const { data: recentNotes, error: fetchErr } = await supabase
        .from('crm_activities')
        .select('id, description')
        .eq('lead_id', lead.id)
        .eq('activity_type', 'note')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (fetchErr) throw fetchErr;
      
      if (!recentNotes || recentNotes.length === 0) {
        const { error: leadErr } = await supabase
          .from('crm_leads')
          .update({ notes: null })
          .eq('id', lead.id);
        if (leadErr) throw leadErr;
        toast.success("Note cleared");
        refreshLeads();
        return;
      }
      
      const targetNote = recentNotes[0];
      
      const { error: deleteErr } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', targetNote.id);
        
      if (deleteErr) throw deleteErr;
      
      if (lead.notes) {
        const parts = lead.notes.split('\n\n---\n\n');
        const updatedParts = parts.filter((part: string) => part.trim() !== targetNote.description.trim());
        const updatedNotes = updatedParts.join('\n\n---\n\n') || null;
        
        const { error: leadErr } = await supabase
          .from('crm_leads')
          .update({ notes: updatedNotes })
          .eq('id', lead.id);
        if (leadErr) throw leadErr;
      }
      
      toast.success("Recent note deleted");
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete recent note");
      console.error(error);
    }
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
      business_type: '',
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
      contact_person: lead.contact_person || '',
      company_name: lead.company_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: lead.estimated_value === 0 ? '' : (lead.estimated_value || '').toString(),
      service_interest: lead.service_interest || '',
      business_type: lead.business_type || '',
      website: lead.website || '',
      external_link: lead.external_link || '',
      assigned_to: lead.assigned_to || ''
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
      const numericValue = typeof formData.estimated_value === 'string' 
        ? parseInt(formData.estimated_value.replace(/[^0-9.]/g, '')) || 0 
        : formData.estimated_value;

      // Smart name fallback
      let finalCompany = formData.company_name.trim();
      let finalContact = formData.contact_person.trim() || finalCompany;

      const dataToSave = { 
        contact_person: finalContact,
        company_name: finalCompany, 
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        estimated_value: numericValue,
        service_interest: formData.service_interest.trim() || null,
        business_type: formData.business_type.trim() || null,
        website: formData.website.trim() || null,
        external_link: formData.external_link.trim() || null,
        workspace_id: user?.workspace_id,
        assigned_to: formData.assigned_to || null
      };

      if (isEditMode && editingLeadId) {
        const { error } = await supabase
          .from('crm_leads')
          .update(dataToSave)
          .eq('id', editingLeadId);
        if (error) throw error;
        toast.success("Lead updated successfully");
      } else {
        const { error } = await supabase
          .from('crm_leads')
          .insert([{
            ...dataToSave,
            status: 'New Leads',
            source: 'Manual Entry'
          }]);
        if (error) throw error;
        toast.success("Lead added to New Leads");
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
      refreshLeads();
    } catch (error) {
      toast.error("Failed to update stage");
      console.error(error);
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

  const getLeadsForStage = (stage: typeof STAGES[0]) => {
    return leads.filter(l => 
      (l.status === stage.key || stage.aliases.includes(l.status)) &&
      (filterSalesperson === "All" || l.assigned_to === filterSalesperson) &&
      (!isSalesperson || l.assigned_to === user?.id)  // Salespersons only see their own
    );
  };

  const unmappedLeads = leads.filter(l => 
    !STAGES.some(s => s.key === l.status || s.aliases.includes(l.status)) &&
    (filterSalesperson === "All" || l.assigned_to === filterSalesperson) &&
    (!isSalesperson || l.assigned_to === user?.id)
  );

  const handleAction = (type: 'call' | 'wa' | 'mail', detail: string) => {
    if (!detail) return;
    if (type === 'call') {
      window.open(`tel:${detail}`);
    } else if (type === 'wa') {
      const cleanPhone = detail.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else if (type === 'mail') {
      window.open(`mailto:${detail}`);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background relative w-full h-full animate-in fade-in duration-300" key="pipeline-root">
      <style>{`
        .custom-horizontal-scrollbar::-webkit-scrollbar {
          height: 12px !important;
          display: block !important;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02) !important;
          border-radius: 10px !important;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3) !important;
          border-radius: 10px !important;
          border: 3px solid transparent !important;
          background-clip: content-box !important;
        }
        .custom-horizontal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.6) !important;
          background-clip: content-box !important;
        }
      `}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 sticky top-0 z-20 bg-background/80 backdrop-blur-md p-4 lg:p-4 border-b border-border shadow-sm">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-foreground leading-none">Pipeline</h1>
          {unmappedLeads.length > 0 && (
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1">
              ⚠ {unmappedLeads.length} unmapped
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {/* Admin-only: Salesperson filter dropdown */}
          {isAdmin && (
            <div className="flex items-center gap-2 bg-background border border-input rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filter:</span>
              <select 
                value={filterSalesperson}
                onChange={(e) => setFilterSalesperson(e.target.value)}
                className="text-xs font-bold text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="All" className="bg-background text-foreground">All Salespersons</option>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              type="text"
              placeholder="Search in pipeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-48"
            />
          </div>
          <Button 
            onClick={openAddModal}
            className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 animate-pulse-subtle"
          >
            <Plus size={18} className="mr-2" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto pb-8 scroll-smooth custom-horizontal-scrollbar overflow-y-auto">
        <div className="flex gap-4 lg:gap-6 h-full min-w-max pb-4 px-4">
          {STAGES.map((stage, sIdx) => {
            const rawLeads = sIdx === 0 
              ? [...getLeadsForStage(stage), ...unmappedLeads]
              : getLeadsForStage(stage);
            
            const stageLeads = rawLeads.filter(l => 
              (l.contact_person?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
              (l.company_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
            );
            
            const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

            return (
              <div key={stage.name} className={`flex-shrink-0 w-[85vw] sm:w-[380px] flex flex-col min-h-[850px] bg-card/40 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-border shadow-2xl overflow-hidden backdrop-blur-md`}>
                {/* Stage Header */}
                <div className="p-6 flex-shrink-0 relative bg-background/50 border-b-2 border-border backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-black ${stage.textColor} text-base tracking-tight truncate max-w-[200px] uppercase whitespace-nowrap`}>{stage.name}</h3>
                      <button 
                        onClick={() => setShowInfoFor(showInfoFor === stage.key ? null : stage.key)}
                        className="text-muted-foreground hover:text-primary transition-colors bg-background/50 p-1.5 rounded-full"
                      >
                        <HelpCircle size={16} />
                      </button>
                    </div>
                    <span className={`text-xs font-black bg-gradient-to-br ${stage.color} text-white px-3 py-1 rounded-full shadow-lg shadow-primary/20`}>{stageLeads.length}</span>
                  </div>
                  <div className={`text-sm ${stage.textColor} font-black tracking-widest`}>₹{(totalValue || 0).toLocaleString()}</div>
                  
                  {/* Stage Description Tooltip */}
                  {showInfoFor === stage.key && (
                    <div className="absolute top-full left-4 right-4 z-50 p-5 bg-card border-2 border-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] text-xs text-muted-foreground animate-in slide-in-from-top-2 duration-300">
                      <p className="leading-relaxed font-bold tracking-tight">{stage.description}</p>
                    </div>
                  )}
                </div>

                {/* Stage Column */}
                <div className={`p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar bg-background/20`}>
                  {stageLeads.map((lead) => {
                    const hasPhone = !!lead.phone;
                    const hasEmail = !!lead.email;

                    const highlightClass = getLeadHighlightClass(lead);

                    return (
                      <Card 
                        key={lead.id} 
                        className={`bg-card/80 border-border border-2 p-4 sm:p-6 hover:shadow-2xl transition-all relative group border-t-4 border-t-transparent hover:border-t-primary rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-md min-h-[300px] flex flex-col justify-between ${highlightClass} ${
                          glowingLeadId === lead.id
                            ? 'ring-4 ring-indigo-500 border-indigo-400 shadow-[0_0_35px_rgba(99,102,241,0.8)] scale-[1.02] bg-indigo-500/10 z-30 animate-pulse'
                            : ''
                        }`}
                      >
                        {/* Stage Navigation Arrows */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 lg:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <button 
                            onClick={() => updateLeadStage(lead.id, lead.status, 'backward')}
                            disabled={sIdx === 0}
                            className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === 0 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button 
                            onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                            disabled={sIdx === STAGES.length - 1}
                            className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === STAGES.length - 1 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>

                        {/* Top alignment layout */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-2">
                            {/* Primary Heading is Company Name */}
                            <h4 className="font-bold text-foreground text-base tracking-tight leading-snug mb-0.5 break-words" title={lead.company_name || lead.contact_person}>
                              {lead.company_name || lead.contact_person}
                            </h4>
                            {/* Secondary sub-heading is Contact Name */}
                            {lead.contact_person && lead.contact_person !== lead.company_name && (
                              <p className="text-[10px] text-muted-foreground font-black tracking-wider uppercase break-words">
                                {lead.contact_person}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => togglePin(lead.id, !!lead.is_pinned)}
                              className={`p-2 rounded-xl transition-all border ${lead.is_pinned ? 'bg-primary/10 border-primary text-primary opacity-100' : 'hover:bg-background border-transparent hover:border-primary/20 opacity-0 group-hover:opacity-100'}`}
                              title={lead.is_pinned ? "Unpin" : "Pin to top"}
                            >
                              {lead.is_pinned ? <Pin size={14} fill="currentColor" /> : <Pin size={14} />}
                            </button>
                            <button 
                              onClick={() => openEditModal(lead)}
                              className="p-2 hover:bg-background rounded-xl transition-colors text-primary border border-transparent hover:border-primary/20 opacity-0 group-hover:opacity-100"
                              title="Edit Lead"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => deleteLead(lead.id)}
                              className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-red-400 border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100"
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Highlight Services Badge */}
                        <div className="flex flex-wrap items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                           {lead.service_interest && (
                             <div className="px-2.5 py-1 bg-primary/10 border border-primary/25 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">
                               {lead.service_interest}
                             </div>
                           )}
                           {lead.business_type && (
                              <div className="px-2.5 py-1 bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 text-[9px] font-black rounded-lg uppercase tracking-wider whitespace-nowrap">
                                {lead.business_type}
                              </div>
                           )}
                           {lead.website && (
                              <a href={formatUrl(lead.website)} target="_blank" rel="noopener noreferrer" 
                                 className="p-1.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-500/15 active:scale-90"
                                 title="Visit Website">
                                 <Globe size={16} />
                              </a>
                           )}
                           {lead.external_link && (
                              <a href={formatUrl(lead.external_link)} target="_blank" rel="noopener noreferrer" 
                                 className="p-1.5 bg-rose-600/10 border border-rose-500/30 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-500/15 active:scale-90"
                                 title="Google Maps">
                                 <MapPin size={16} />
                              </a>
                           )}
                        </div>

                        {/* Interactive Action Buttons */}
                        <div className="flex flex-wrap gap-2 my-2.5 py-3 border-t border-b border-border/40" onClick={(e) => e.stopPropagation()}>
                          <button 
                            disabled={!hasPhone}
                            onClick={() => handleAction('call', lead.phone)}
                            className={`flex-1 min-w-[65px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-90 whitespace-nowrap ${
                              hasPhone 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/15 cursor-pointer' 
                                : 'opacity-30 bg-muted text-muted-foreground border-transparent cursor-not-allowed shadow-none hover:bg-muted'
                            }`} 
                            title={hasPhone ? "Call client" : "Phone number not available"}
                          >
                            <Phone size={13} />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Call</span>
                          </button>
                          
                          <button 
                            disabled={!hasPhone}
                            onClick={() => handleAction('wa', lead.phone)}
                            className={`flex-1 min-w-[65px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-90 whitespace-nowrap ${
                              hasPhone 
                                ? 'bg-[#25D366] hover:bg-[#22c35e] text-white shadow-green-600/15 cursor-pointer' 
                                : 'opacity-30 bg-muted text-muted-foreground border-transparent cursor-not-allowed shadow-none hover:bg-muted'
                            }`} 
                            title={hasPhone ? "WhatsApp chat" : "Phone number not available"}
                          >
                            <MessageCircle size={13} />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">WA</span>
                          </button>
                          
                          <button 
                            disabled={!hasEmail}
                            onClick={() => handleAction('mail', lead.email)}
                            className={`flex-1 min-w-[65px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-90 whitespace-nowrap ${
                              hasEmail 
                                ? 'bg-[#EA4335] hover:bg-[#d93025] text-white shadow-red-600/15 cursor-pointer' 
                                : 'opacity-30 bg-muted text-muted-foreground border-transparent cursor-not-allowed shadow-none hover:bg-muted'
                            }`} 
                            title={hasEmail ? "Send Email" : "Email address not available"}
                          >
                            <Mail size={13} />
                            <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">Mail</span>
                          </button>
                        </div>

                        {/* Card Footer: Value and details */}
                        <div className="flex items-center justify-between mt-auto pt-1.5">
                          <div className="flex flex-col">
                             <div className={`text-base font-black ${stage.textColor} tracking-tight bg-primary/5 px-2.5 py-0.5 rounded-lg border border-primary/10 mb-1 whitespace-nowrap`}>
                               ₹{(lead.estimated_value || 0).toLocaleString()}
                             </div>
                             {lead.assigned_user && (
                               <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 truncate max-w-[150px]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shrink-0"></div>
                                  <span className="truncate">Owner: {lead.assigned_user.full_name || lead.assigned_user.username}</span>
                               </div>
                             )}
                          </div>
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-xs font-black text-white border-2 border-card shadow-xl`}>
                            {(lead.company_name || lead.contact_person || 'U')[0].toUpperCase()}
                          </div>
                        </div>

                        {/* Display Next Scheduled Action */}
                        {lead.crm_tasks && lead.crm_tasks.some((t: any) => t.status === 'Pending') && (
                          <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Upcoming Action</p>
                            {lead.crm_tasks
                              .filter((t: any) => t.status === 'Pending')
                              .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                              .slice(0, 1)
                              .map((task: any) => (
                                <div key={task.id} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Clock size={11} className="text-amber-500 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-foreground truncate">{task.title}</p>
                                        <p className="text-[8px] text-muted-foreground font-semibold uppercase">
                                          {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                          {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                      className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 shrink-0"
                                      title="Delete Action"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1 border-t border-border/10" onClick={(e) => e.stopPropagation()}>
                                    <a 
                                      href={googleCalendarService.generateGoogleCalendarLink(task)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition-all"
                                      title="Add to Google Calendar directly (No API keys required)"
                                    >
                                      <Calendar size={8} /> Add
                                    </a>
                                    <a 
                                      href={googleCalendarService.generateGmailComposeLink(
                                        task,
                                        lead.email || '',
                                        googleCalendarService.generateGoogleCalendarLink(task)
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[8px] font-black uppercase tracking-wider transition-all"
                                      title="Compose prefilled Gmail invitation to send"
                                    >
                                      <Mail size={8} /> Invite
                                    </a>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                         {/* Display Logged Notes */}
                         {lead.notes && (
                           <div className="mt-2.5 p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl group/note relative">
                             <div className="flex items-center justify-between mb-1">
                               <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                 <Clipboard size={10} className="text-indigo-400" /> Recent Note
                               </p>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); deleteRecentNote(lead); }}
                                 className="p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover/note:opacity-100 transition-opacity"
                                 title="Delete Note"
                               >
                                 <Trash2 size={10} />
                               </button>
                             </div>
                             <div className="text-[10px] text-muted-foreground leading-relaxed max-h-[75px] overflow-y-auto custom-scrollbar whitespace-pre-wrap font-medium">
                               {lead.notes.split('\n\n---\n\n')[0].trim()}
                             </div>
                           </div>
                         )}

                        {/* Structured Note logger & Scheduler actions */}
                        <div className="grid grid-cols-2 gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => openNoteModal(lead)}
                            className="px-2 py-2.5 bg-background border border-border hover:bg-muted/50 rounded-xl font-black text-[9px] uppercase tracking-wider text-muted-foreground transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Clipboard size={12} />
                            Log Note
                          </button>
                          
                          <button 
                            onClick={() => openTaskModal(lead)}
                            className={`px-2 py-2.5 bg-gradient-to-r ${stage.color} hover:brightness-110 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-lg shadow-indigo-600/15 transition-all active:scale-95 flex items-center justify-center gap-1`}
                          >
                            <Plus size={12} />
                            {lead.crm_tasks && lead.crm_tasks.some((t: any) => t.status === 'Pending') ? 'Update Action' : 'Schedule Action'}
                          </button>
                        </div>

                      </Card>
                    );
                  })}

                  {/* Empty Stage Info */}
                  {stageLeads.length === 0 && (
                    <div className="border-2 border-dashed border-border/30 rounded-3xl p-8 text-center bg-background/5">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 whitespace-nowrap">Empty Stage</p>
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-500 max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/30">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{isEditMode ? 'Update Details' : 'Add to Pipeline'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-background rounded-2xl transition-colors text-muted-foreground bg-background/50"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Company Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="e.g. TechFlow Pvt Ltd"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contact Name</label>
                  <input 
                    type="text" 
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Value (₹)</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-base">₹</div>
                    <input 
                      type="text" 
                      value={formData.estimated_value}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && val.startsWith('0')) {
                          val = val.substring(1);
                        }
                        setFormData({...formData, estimated_value: val});
                      }}
                      placeholder="Enter amount..."
                      className="w-full pl-10 pr-5 py-3.5 bg-background border border-input rounded-2xl text-base text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black tracking-tight" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Website Link</label>
                  <input 
                    type="text" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="company.com"
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

              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Owner Assignment</label>
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

      {/* Log Interaction Note Modal (Structured Notes) */}
      {isNoteModalOpen && selectedLeadForNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-border flex items-center justify-between bg-background/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Log Client Interaction</h2>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">For {selectedLeadForNote.company_name}</p>
              </div>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-background rounded-xl transition-colors text-muted-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleNoteSubmit} className="p-5 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Interaction Type</label>
                    <select 
                      value={noteFormData.interaction_type}
                      onChange={(e) => setNoteFormData({...noteFormData, interaction_type: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="call" className="bg-background text-foreground">📞 Phone Call</option>
                      <option value="whatsapp" className="bg-background text-foreground">💬 WhatsApp Msg</option>
                      <option value="email" className="bg-background text-foreground">📧 Email Sent/Recv</option>
                      <option value="meeting" className="bg-background text-foreground">🤝 F2F Meeting</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Client Sentiment</label>
                    <select 
                      value={noteFormData.sentiment}
                      onChange={(e) => setNoteFormData({...noteFormData, sentiment: e.target.value})}
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="Very Interested" className="bg-background text-foreground">🟢 Very Interested</option>
                      <option value="Interested" className="bg-background text-foreground">🟡 Interested</option>
                      <option value="Neutral" className="bg-background text-foreground">⚪ Neutral / Followup</option>
                      <option value="Hesitant" className="bg-background text-foreground">🟠 Hesitant</option>
                      <option value="Not Interested" className="bg-background text-foreground">🔴 Not Interested</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Key Discussion Points *</label>
                  <textarea 
                    value={noteFormData.discussion_points}
                    onChange={(e) => setNoteFormData({...noteFormData, discussion_points: e.target.value})}
                    placeholder="What did they say? What was requested?"
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium custom-scrollbar" 
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Agreed Next Steps</label>
                  <input 
                    type="text" 
                    value={noteFormData.next_steps}
                    onChange={(e) => setNoteFormData({...noteFormData, next_steps: e.target.value})}
                    placeholder="e.g., Send pricing spreadsheet tomorrow"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Additional Notes</label>
                  <textarea 
                    value={noteFormData.additional_notes}
                    onChange={(e) => setNoteFormData({...noteFormData, additional_notes: e.target.value})}
                    placeholder="Any personal context, other stakeholders, budget caveats..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium custom-scrollbar" 
                  />
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Clipboard size={16} className="mr-2" />}
                  Save Note
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsNoteModalOpen(false)} 
                  className="w-full py-6 text-muted-foreground hover:bg-background rounded-xl font-bold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Scheduler Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-border flex items-center justify-between bg-background/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Schedule Next Action</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold tracking-widest uppercase mt-1">Universal Scheduler</p>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="p-2 sm:p-3 hover:bg-background rounded-2xl transition-colors text-muted-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Action Type</label>
                    <select 
                      value={taskFormData.task_type}
                      onChange={(e) => setTaskFormData({...taskFormData, task_type: e.target.value})}
                      className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="call" className="bg-background text-foreground">📞 Call</option>
                      <option value="email" className="bg-background text-foreground">📧 Email</option>
                      <option value="meeting" className="bg-background text-foreground">🤝 Meeting</option>
                      <option value="quotation" className="bg-background text-foreground">📄 Send Quotation</option>
                      <option value="custom" className="bg-background text-foreground">✍️ Custom...</option>
                    </select>
                  </div>
                  {taskFormData.task_type === 'custom' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Custom Action Name *</label>
                      <input 
                        type="text" 
                        required
                        value={taskFormData.custom_task_type}
                        onChange={(e) => setTaskFormData({...taskFormData, custom_task_type: e.target.value})}
                        placeholder="e.g. Site Visit, Presentation, Code Review"
                        className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold" 
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Schedule Date</label>
                    <input 
                      type="date" 
                      value={taskFormData.scheduled_date}
                      onChange={(e) => setTaskFormData({...taskFormData, scheduled_date: e.target.value})}
                      className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Schedule Time (12h)</label>
                    <div className="flex gap-1 sm:gap-2">
                      <input 
                        type="time" 
                        value={taskFormData.scheduled_time}
                        onChange={(e) => setTaskFormData({...taskFormData, scheduled_time: e.target.value})}
                        className="min-w-0 flex-1 px-3 sm:px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                      />
                      <select 
                        value={taskFormData.scheduled_ampm}
                        onChange={(e) => setTaskFormData({...taskFormData, scheduled_ampm: e.target.value})}
                        className="w-16 sm:w-24 px-2 sm:px-4 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-black appearance-none cursor-pointer text-center"
                      >
                        <option value="AM" className="bg-background text-foreground">AM</option>
                        <option value="PM" className="bg-background text-foreground">PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Action Title</label>
                  <input 
                    type="text" 
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                    placeholder="e.g. Discuss new requirements"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold" 
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Action Notes</label>
                  <textarea 
                    value={taskFormData.notes}
                    onChange={(e) => setTaskFormData({...taskFormData, notes: e.target.value})}
                    placeholder="Write down any specific details for this action..."
                    rows={4}
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold resize-none" 
                  />
                </div>

                {/* Google Calendar Sync Selector */}
                {linkedAccounts.length > 0 && (
                  <div className="p-4 bg-background border border-input rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-foreground cursor-pointer flex items-center gap-2 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={syncToGoogle}
                          onChange={e => setSyncToGoogle(e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        Sync to Google Calendar
                      </label>
                    </div>

                    {syncToGoogle && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Select Google Account</label>
                          <select
                            value={syncAccount}
                            onChange={e => setSyncAccount(e.target.value)}
                            className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer"
                          >
                            {linkedAccounts.map(account => (
                              <option key={account.email} value={account.email} className="bg-background text-foreground">
                                {account.name} ({account.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">Attendees (comma-separated emails)</label>
                          <input
                            type="text"
                            value={attendeesInput}
                            onChange={e => setAttendeesInput(e.target.value)}
                            placeholder="salesperson@company.com, admin@company.com"
                            className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                          />
                          <p className="text-[9px] text-muted-foreground mt-1 px-1 font-semibold leading-relaxed">
                            Invite other users or the lead. Google will send calendar invitations automatically.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  type="submit" 
                  disabled={taskSubmitting} 
                  className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
                >
                  {taskSubmitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <Clock size={20} className="mr-2" />}
                  Schedule Action
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsTaskModalOpen(false)} 
                  className="w-full py-6 text-muted-foreground hover:bg-background rounded-2xl font-bold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
