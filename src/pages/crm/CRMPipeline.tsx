/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from "react";
type GoogleAccount = { email: string; name: string; expiresAt: number; [key: string]: any };

import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, ChevronRight, ChevronLeft, Plus, Loader2, X, HelpCircle, Trash2, Edit2, Pin, Clock, Globe, MapPin, Clipboard, Search, Calendar, Zap, Flame, Snowflake, MoreHorizontal, ArrowUpDown, ChevronDown, Info, Building2, Layers, Check } from "lucide-react";

import { useWorkspaceUsers } from '@/hooks/useWorkspaceUsers';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useMobile';

import { useCRMData } from '@/contexts/CRMDataContext';
import { useLeadScoring } from '@/hooks/useLeadScoring';
import { formatUrl } from '../../utils/formatUrl';
import { googleCalendarService } from '@/services/googleCalendarService';
import { getTaskDueDate } from '@/utils/dateUtils';
import CRMDuplicateLeadsModal from '@/components/crm/CRMDuplicateLeadsModal';
import { findDuplicateLeads } from '@/utils/crmDuplicateFinder';
import { resolveLeadCompanyName, resolveLeadContactPerson } from '@/utils/crmLeadUtils';

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
    description: "Initial communication made (call/email/message).",
    aliases: ['contacted', 'CONTACTED']
  },
  { 
    name: "Not Interested", 
    key: 'Not Interested', 
    color: 'from-rose-500 to-rose-700',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-500',
    description: "Prospect is currently not interested.",
    aliases: ['Not Interested', 'NOT_INTERESTED']
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

// Extract a human-readable location from external_link (plain address text,
// or a Google Maps URL with the address encoded in it).
const getLeadLocation = (lead: Record<string, any>): string => {
  const raw = (lead.external_link || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const q = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('destination');
      if (q) return q.replace(/\+/g, ' ');
      const m = raw.match(/\/maps\/(?:search|place)\/([^/@?]+)/);
      if (m) return decodeURIComponent(m[1]).replace(/\+/g, ' ');
      return '';
    } catch {
      return '';
    }
  }
  return raw;
};


export default function CRMPipeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { leads, allLeads, activities, tasks, loading, refreshLeads, crmViewMode } = useCRMData();
  const scoredLeads = useLeadScoring(leads, activities, tasks);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileActiveStage, setMobileActiveStage] = useState('New Leads');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Duplicate leads state (respects active My CRM vs Team CRM toggle)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const duplicateAnalysis = useMemo(() => {
    const activeLeadsScope = crmViewMode === 'mine' ? leads : (allLeads || leads);
    return findDuplicateLeads(activeLeadsScope || []);
  }, [crmViewMode, leads, allLeads]);

  useEffect(() => {
    const hasPendingTasks = leads.some(lead => 
      lead.crm_tasks?.some((t: Record<string, any>) => t.status === 'Pending')
    );
    if (!hasPendingTasks) return;

    // 60s is enough precision for due-time highlights; 5s caused re-render storms during typing
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [leads]);

  const getLeadHighlightClass = (lead: Record<string, any>) => {
    if (!lead.crm_tasks || lead.crm_tasks.length === 0) return '';
    
    let urgency: 'red' | 'orange' | 'blue' | null = null;
    const todayStr = new Date().toISOString().split('T')[0];
    
    lead.crm_tasks.forEach((task: Record<string, any>) => {
      if (task.status !== 'Pending') return;

      // If task has NO explicit due_time, only mark red if the due date is strictly in the past
      if (!task.due_time) {
        if (task.due_date && task.due_date < todayStr) {
          urgency = 'red';
        }
        return;
      }
      
      const dueDate = getTaskDueDate(task.due_date, task.due_time);
      if (!dueDate) return;
      
      const diffMs = dueDate.getTime() - currentTime.getTime();
      
      if (diffMs <= 0) {
        urgency = 'red'; // Due right now or overdue -> red alarm glow
      }
    });
    
    if (urgency === 'red') return 'blink-ring-red';
    return '';
  };
  
  // Note Logger state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedLeadForNote, setSelectedLeadForNote] = useState<Record<string, any> | null>(null);
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
  const workspaceUsers = useMemo(() => {
    const filteredList = users.filter(u => {
      // Exclude placeholder system admin accounts unless it is the logged-in user
      const isSystemAdminPlaceholder = ['admin', 'oomadmin'].includes(u.username?.toLowerCase()) && u.id !== user?.id;
      if (isSystemAdminPlaceholder) return false;

      const isUserAdmin = u.role === 'admin';
      const isUserBusinessMarketing = (u.designation || '').toLowerCase().includes('business') ||
                                      (u.designation || '').toLowerCase().includes('marketing');
      return isUserAdmin || isUserBusinessMarketing;
    });

    const list = filteredList.filter(u => u.id !== user?.id);
    const currentUserObj = users.find(u => u.id === user?.id);
    if (currentUserObj) {
      return [currentUserObj, ...list];
    }
    return list;
  }, [users, user?.id]);

  const [filterSortBy, setFilterSortBy] = useState<string>("Score");

  const [linkedAccounts, setLinkedAccounts] = useState<GoogleAccount[]>([]);
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

  // Role check: admin sees all, non-admins see only their own leads
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isSalesperson = !isAdmin;
  // Render one layout at a time (avoids duplicate DOM and keeps the mobile
  // single-stage view light). Below 768px we show the optimized mobile view.
  const isMobileViewport = useIsMobile();
  const [glowingLeadId] = useState<string | null>(null);

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
    comment_on_business: ''
  });

  const [activeMoreMenuLeadId, setActiveMoreMenuLeadId] = useState<string | null>(null);
  const [showPipelineInfo, setShowPipelineInfo] = useState<boolean>(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  // Dedicated Desktop View Type: 'compact' (sleek uniform cards with minimized activity pills) vs 'expanded' (full inline boxes)
  const [pipelineCardViewMode, setPipelineCardViewMode] = useState<'compact' | 'expanded'>(() => {
    try {
      const saved = localStorage.getItem('crm_pipeline_card_view_mode');
      if (saved === 'compact' || saved === 'expanded') return saved;
    } catch {
      // ignore
    }
    return 'compact';
  });

  const handleSetViewMode = useCallback((mode: 'compact' | 'expanded') => {
    setPipelineCardViewMode(mode);
    try {
      localStorage.setItem('crm_pipeline_card_view_mode', mode);
    } catch {
      // ignore
    }
  }, []);

  // Full Lead Intel & Activity Popup Modal State
  const [activeDetailsLead, setActiveDetailsLead] = useState<Record<string, any> | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'all' | 'comment' | 'schedule' | 'notes'>('all');
  const [detailsEditingComment, setDetailsEditingComment] = useState('');
  const [isSavingDetailsComment, setIsSavingDetailsComment] = useState(false);

  const openLeadDetails = useCallback((lead: Record<string, any>, tab: 'all' | 'comment' | 'schedule' | 'notes' = 'all') => {
    setActiveDetailsLead(lead);
    setActiveDetailsTab(tab);
    setDetailsEditingComment(lead.comment_on_business || lead.custom_data?.comment_on_business || '');
  }, []);

  const handleSaveDetailsComment = async () => {
    if (!activeDetailsLead) return;
    setIsSavingDetailsComment(true);
    try {
      const existingCustom = activeDetailsLead.custom_data || {};
      const updatedCustom = {
        ...existingCustom,
        comment_on_business: detailsEditingComment.trim() || null
      };

      const { error } = await supabase
        .from('crm_leads')
        .update({
          custom_data: updatedCustom
        })
        .eq('id', activeDetailsLead.id);

      if (error) throw error;
      toast.success("Business comment updated!");
      setActiveDetailsLead(prev => prev ? {
        ...prev,
        comment_on_business: detailsEditingComment.trim() || null,
        custom_data: updatedCustom
      } : null);
      refreshLeads();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save comment");
    } finally {
      setIsSavingDetailsComment(false);
    }
  };



  const togglePin = useCallback(async (leadId: string, currentStatus: boolean) => {
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
  }, [refreshLeads, toast]);

  const openTaskModal = useCallback((lead: Record<string, any>) => {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const time12 = `${hours12.toString().padStart(2, '0')}:${minutes}`;

    setTaskFormData({
      title: `Follow up with ${resolveLeadCompanyName(lead)}`,
      task_type: 'call',
      custom_task_type: '',
      scheduled_date: now.toISOString().split('T')[0],
      scheduled_time: time12,
      scheduled_ampm: ampm,
      notes: '',
      lead_id: lead.id
    });
    setIsTaskModalOpen(true);
  }, []);

  const openNoteModal = useCallback((lead: Record<string, any>) => {
    setSelectedLeadForNote(lead);
    setNoteFormData({
      interaction_type: 'call',
      discussion_points: '',
      sentiment: 'Interested',
      next_steps: '',
      additional_notes: ''
    });
    setIsNoteModalOpen(true);
  }, []);

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
        description: formattedNote,
        workspace_id: user.workspace_id
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
      const timeStr = taskFormData.scheduled_time || '10:00';
      const timeParts = timeStr.split(':').map(Number);
      let hours = isNaN(timeParts[0]) ? 10 : timeParts[0];
      const minutes = isNaN(timeParts[1]) ? 0 : timeParts[1];
      if (taskFormData.scheduled_ampm === 'PM' && hours < 12) hours += 12;
      if (taskFormData.scheduled_ampm === 'AM' && hours === 12) hours = 0;
      
      const dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      let finalTaskType = taskFormData.task_type;
      if (taskFormData.task_type === 'custom') {
        finalTaskType = taskFormData.custom_task_type.trim() || 'Custom Action';
      }

      // Insert the task record
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
        .maybeSingle();

      // Code 22P02 = pg_net trigger JSON error - task was still saved, ignore it
      if (error && error.code !== '22P02') throw error;
      if (error?.code === '22P02') {
        console.warn('[CRM] Push webhook trigger has a JSON config issue. Task was saved. Fix setup_push_webhook.sql on Supabase.');
      }
      
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

  const deleteTask = useCallback(async (taskId: string) => {
    if (!window.confirm("Delete this scheduled action?")) return;
    try {
      await googleCalendarService.deleteTaskEvent(taskId);
      const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success("Action deleted");
      refreshLeads();
    } catch (error) {
      toast.error("Failed to delete action");
      console.error(error);
    }
  }, [refreshLeads, toast]);

  const deleteRecentNote = useCallback(async (lead: Record<string, any>) => {
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
  }, [refreshLeads, toast]);

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
      comment_on_business: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((lead: Record<string, any>) => {
    setIsEditMode(true);
    setEditingLeadId(lead.id);
    const resolvedCompany = resolveLeadCompanyName(lead);
    const resolvedContact = resolveLeadContactPerson(lead);
    setFormData({
      contact_person: (lead.contact_person && lead.contact_person !== 'Unknown Contact') ? lead.contact_person : resolvedContact,
      company_name: (lead.company_name && lead.company_name !== 'Unknown Company') ? lead.company_name : resolvedCompany,
      email: lead.email || '',
      phone: lead.phone || '',
      estimated_value: lead.estimated_value === 0 ? '' : (lead.estimated_value || '').toString(),
      service_interest: lead.service_interest || '',
      business_type: lead.business_type || '',
      website: lead.website || '',
      external_link: lead.external_link || '',
      assigned_to: lead.assigned_to || '',
      comment_on_business: lead.comment_on_business || lead.custom_data?.comment_on_business || ''
    });
    setIsModalOpen(true);
  }, []);

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
      const finalCompany = formData.company_name.trim();
      const finalContact = formData.contact_person.trim() || finalCompany;

      const existingLead = isEditMode && editingLeadId ? leads.find(l => l.id === editingLeadId) : null;
      const existingCustom = existingLead?.custom_data || {};

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
        assigned_to: isAdmin ? (formData.assigned_to || null) : (user?.id || null),
        custom_data: {
          ...existingCustom,
          comment_on_business: formData.comment_on_business.trim() || null
        }
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

  const updateLeadStage = useCallback(async (leadId: string, currentStageKey: string, direction: 'forward' | 'backward') => {
    const currentIndex = STAGES.findIndex(s => s.key === currentStageKey || s.aliases.includes(currentStageKey));
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= STAGES.length) return;

    const nextStageKey = STAGES[nextIndex].key;

    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: nextStageKey })
        .eq('id', leadId);

      // Code 22P02 = pg_net trigger JSON error - lead was still updated, ignore it
      if (error && error.code !== '22P02') throw error;
      if (error?.code === '22P02') {
        console.warn('[CRM] Push webhook trigger has a JSON config issue. Lead stage was updated. Fix setup_push_webhook.sql on Supabase.');
      }

      toast.success(`Moved to ${STAGES[nextIndex].name}`);
    } catch (error: any) {
      toast.error("Failed to update stage");
      console.error("[PIPELINE MOVE ERROR] Details:", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
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
  }, [refreshLeads, toast]);

  // Rep scoping (all reps vs one rep) is handled globally by CRMDataContext,
  // driven by the Team CRM / rep selector in the layout header.
  const unmappedLeads = useMemo(() => scoredLeads.filter(l => 
    !STAGES.some(s => s.key === l.status || s.aliases.includes(l.status)) &&
    (!isSalesperson || l.assigned_to === user?.id)
  ), [scoredLeads, isSalesperson, user?.id]);

  const handleAction = useCallback((type: 'call' | 'wa' | 'mail', detail?: string) => {
    if (!detail || detail.trim() === '' || detail.toLowerCase() === 'none' || detail.toLowerCase() === 'n/a') return;
    if (type === 'call') {
      window.location.href = `tel:${detail}`;
    } else if (type === 'wa') {
      const cleanPhone = detail.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else if (type === 'mail') {
      window.location.href = `mailto:${detail}`;
    }
  }, []);

  const getLeadsForStage = useCallback((stage: typeof STAGES[0]) => {
    return scoredLeads.filter(l => 
      (l.status === stage.key || stage.aliases.includes(l.status)) &&
      (!isSalesperson || l.assigned_to === user?.id)
    );
  }, [scoredLeads, isSalesperson, user?.id]);

  // ---- Mobile single-stage helpers (optimized mobile layout) ----
  const getMobileStageLeads = useCallback((stage: typeof STAGES[0]) => {
    const raw = stage.key === 'New Leads'
      ? [...getLeadsForStage(stage), ...unmappedLeads]
      : getLeadsForStage(stage);
    const q = searchQuery.toLowerCase();
    if (!q) return raw;
    return raw.filter(l => {
      const resolvedCompany = resolveLeadCompanyName(l);
      const resolvedContact = resolveLeadContactPerson(l);
      return (resolvedContact.toLowerCase() || '').includes(q) ||
        (resolvedCompany.toLowerCase() || '').includes(q) ||
        (l.contact_person?.toLowerCase() || '').includes(q) ||
        (l.company_name?.toLowerCase() || '').includes(q);
    });
  }, [getLeadsForStage, unmappedLeads, searchQuery]);

  const activeMobileStage = useMemo(
    () => STAGES.find(s => s.key === mobileActiveStage) || STAGES[0],
    [mobileActiveStage]
  );
  const mobileStageLeads = useMemo(() => {
    let list = getMobileStageLeads(activeMobileStage);
    list = filterSortBy === "Score"
      ? [...list].sort((a, b) => (b.propensityScore || 0) - (a.propensityScore || 0))
      : [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [getMobileStageLeads, activeMobileStage, filterSortBy]);
  const mobileTotalValue = useMemo(
    () => mobileStageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0),
    [mobileStageLeads]
  );

  const closeMoreMenu = useCallback(() => setActiveMoreMenuLeadId(null), []);

   
  const memoizedPipelineBoard = useMemo(() => (
    <div className="hidden md:flex flex-1 overflow-x-auto pb-4 sm:pb-8 scroll-smooth custom-horizontal-scrollbar overflow-y-auto snap-x snap-mandatory">
      <div className="flex gap-2.5 sm:gap-4 lg:gap-6 h-full min-w-max pb-4 px-2 sm:px-4">
        {STAGES.map((stage, sIdx) => {
          const rawLeads = sIdx === 0 
            ? [...getLeadsForStage(stage), ...unmappedLeads]
            : getLeadsForStage(stage);
          
          let stageLeads = rawLeads.filter(l => {
            const resolvedCompany = resolveLeadCompanyName(l);
            const resolvedContact = resolveLeadContactPerson(l);
            const q = searchQuery.toLowerCase();
            return (resolvedContact.toLowerCase() || '').includes(q) ||
              (resolvedCompany.toLowerCase() || '').includes(q) ||
              (l.contact_person?.toLowerCase() || '').includes(q) ||
              (l.company_name?.toLowerCase() || '').includes(q);
          });
          
          if (filterSortBy === "Score") {
             stageLeads = stageLeads.sort((a, b) => (b.propensityScore || 0) - (a.propensityScore || 0));
          } else {
             stageLeads = stageLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          }
          
          const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

          return (
            <div 
              key={stage.name} 
              id={`pipeline-col-${stage.key}`}
              className={`flex-shrink-0 w-[280px] sm:w-[380px] snap-center flex flex-col min-h-[500px] sm:min-h-[700px] lg:min-h-[850px] bg-card/40 rounded-2xl sm:rounded-[2.5rem] border-2 border-border shadow-xl sm:shadow-2xl overflow-hidden backdrop-blur-md`}
            >
              {/* Stage Header */}
              <div className="p-3 sm:p-6 flex-shrink-0 relative bg-background/50 border-b-2 border-border backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className={`font-black ${stage.textColor} text-sm sm:text-base tracking-tight truncate max-w-[160px] sm:max-w-[200px] uppercase whitespace-nowrap`}>{stage.name}</h3>
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
              <div className={`p-3 sm:p-4 space-y-3 sm:space-y-5 flex-1 overflow-y-auto custom-scrollbar bg-background/20`}>
                {stageLeads.map((lead) => {
                  const hasPhone = !!lead.phone && lead.phone.trim() !== '' && lead.phone.toLowerCase() !== 'none' && lead.phone.toLowerCase() !== 'n/a';
                  const hasEmail = !!lead.email && lead.email.trim() !== '' && lead.email.toLowerCase() !== 'none' && lead.email.toLowerCase() !== 'n/a';

                  const highlightClass = getLeadHighlightClass(lead);

                  return (
                    <Card 
                      key={lead.id} 
                      className={`bg-card/85 border-border border-2 p-3 sm:p-4 hover:shadow-xl transition-all relative group border-t-4 border-t-transparent hover:border-t-primary rounded-xl sm:rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between ${highlightClass} ${
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
                          title="Move backward"
                          className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === 0 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                          disabled={sIdx === STAGES.length - 1}
                          title="Move forward"
                          className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === STAGES.length - 1 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>

                      {/* Top alignment layout */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                          {/* Primary Heading is Company Name */}
                          <h4 className="font-bold text-foreground text-base tracking-tight leading-snug mb-0.5 break-words" title={resolveLeadCompanyName(lead)}>
                            {resolveLeadCompanyName(lead)}
                          </h4>
                          {/* Secondary sub-heading is Contact Name */}
                          {(() => {
                            const compName = resolveLeadCompanyName(lead);
                            const contName = resolveLeadContactPerson(lead);
                            return contName && contName !== compName && contName !== 'Unknown Contact' ? (
                              <p className="text-[10px] text-muted-foreground font-black tracking-wider uppercase break-words">
                                {contName}
                              </p>
                            ) : null;
                          })()}
                          {lead.propensityScore !== undefined && (
                            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              lead.propensityScore >= 75 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                              lead.propensityScore >= 40 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                              'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                            }`}>
                              {lead.propensityScore >= 75 ? <Flame size={10} /> : 
                               lead.propensityScore >= 40 ? <Zap size={10} /> : 
                               <Snowflake size={10} />}
                              Score: {lead.propensityScore}
                            </div>
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
                          {(resolveLeadCompanyName(lead) || 'U')[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Minimized Order vs Expanded Order */}
                      {pipelineCardViewMode === 'compact' ? (
                        /* Compact View: Sleek Minimized Activity Badges */
                        <div className="mt-2 pt-2 border-t border-border/40 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 1. Comment on Business Mini Pill */}
                            {(lead.comment_on_business || lead.custom_data?.comment_on_business) && (
                              <button
                                onClick={() => openLeadDetails(lead, 'comment')}
                                className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-md text-[10px] font-bold text-amber-400 flex items-center gap-1 transition-colors active:scale-95"
                                title="Click to view full Business Comment in popup"
                              >
                                <Building2 size={11} className="text-amber-400" />
                                <span>Comment</span>
                              </button>
                            )}

                            {/* 2. Upcoming Action Mini Pill */}
                            {lead.crm_tasks && lead.crm_tasks.some((t: Record<string, any>) => t.status === 'Pending') && (() => {
                              const nextTask = lead.crm_tasks
                                .filter((t: Record<string, any>) => t.status === 'Pending')
                                .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
                              const dateStr = new Date(nextTask.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                              return (
                                <button
                                  onClick={() => openLeadDetails(lead, 'schedule')}
                                  className="px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-md text-[10px] font-bold text-sky-400 flex items-center gap-1 transition-colors active:scale-95"
                                  title={`Upcoming Action: ${nextTask.title} on ${dateStr}`}
                                >
                                  <Clock size={11} className="text-sky-400" />
                                  <span>{dateStr}</span>
                                  <span className="sr-only">Upcoming Action</span>
                                  <span className="sr-only">{nextTask.title}</span>
                                </button>
                              );
                            })()}

                            {/* 3. Log Notes Mini Pill */}
                            {lead.notes && (
                              <button
                                onClick={() => openLeadDetails(lead, 'notes')}
                                className="px-2 py-0.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-md text-[10px] font-bold text-indigo-400 flex items-center gap-1 transition-colors active:scale-95"
                                title="Click to view logged interaction notes in popup"
                              >
                                <Clipboard size={11} className="text-indigo-400" />
                                <span>Notes</span>
                                <span className="sr-only">Recent Note</span>
                                <span className="sr-only">{lead.notes.split('\n\n---\n\n')[0].trim()}</span>
                              </button>
                            )}

                            {/* Open Details Button */}
                            <button
                              onClick={() => openLeadDetails(lead, 'all')}
                              className="ml-auto px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-md text-[10px] font-bold text-slate-200 flex items-center gap-1 transition-colors active:scale-95"
                              title="Open Full Lead Intel & Details Popup"
                            >
                              <Info size={11} className="text-slate-400" />
                              <span>Details</span>
                            </button>
                          </div>

                          {/* Quick Actions Footer */}
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            <button 
                              onClick={() => openNoteModal(lead)}
                              className="py-1.5 px-2 bg-background/60 hover:bg-muted border border-border/60 rounded-lg font-bold text-[9px] uppercase tracking-wider text-muted-foreground transition-all active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Clipboard size={10} />
                              Log Note
                            </button>
                            <button 
                              onClick={() => openTaskModal(lead)}
                              className={`py-1.5 px-2 bg-gradient-to-r ${stage.color} hover:brightness-110 text-white rounded-lg font-bold text-[9px] uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1`}
                            >
                              <Plus size={10} />
                              Action
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Expanded View: Full inline boxes */
                        <div className="space-y-2 mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                          {/* Business Comment */}
                          {(lead.comment_on_business || lead.custom_data?.comment_on_business) && (
                            <div className="p-2.5 bg-slate-900 border border-amber-500/40 rounded-xl space-y-1">
                              <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <Building2 size={11} /> Comment on Business
                              </p>
                              <p className="text-[11px] text-white font-medium whitespace-pre-wrap leading-relaxed line-clamp-3">
                                {lead.comment_on_business || lead.custom_data?.comment_on_business}
                              </p>
                            </div>
                          )}

                          {/* Display Next Scheduled Action */}
                          {lead.crm_tasks && lead.crm_tasks.some((t: Record<string, any>) => t.status === 'Pending') && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Upcoming Action</p>
                              {lead.crm_tasks
                                .filter((t: Record<string, any>) => t.status === 'Pending')
                                .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                                .slice(0, 1)
                                .map((task: Record<string, any>) => (
                                  <div key={task.id} className="space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <Clock size={11} className="text-amber-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-foreground truncate">{task.title}</p>
                                      </div>
                                      <button onClick={() => deleteTask(task.id)} className="p-0.5 text-muted-foreground hover:text-red-500">
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                    <p className="text-[8px] text-muted-foreground font-semibold uppercase">
                                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Display Logged Notes */}
                          {lead.notes && (
                            <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Clipboard size={10} /> Recent Note
                              </p>
                              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {lead.notes.split('\n\n---\n\n')[0].trim()}
                              </p>
                            </div>
                          )}

                          {/* Structured Note logger & Scheduler actions */}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <button 
                              onClick={() => openNoteModal(lead)}
                              className="px-2 py-2 bg-background border border-border hover:bg-muted/50 rounded-xl font-black text-[9px] uppercase tracking-wider text-muted-foreground transition-all active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Clipboard size={11} /> Log Note
                            </button>
                            <button 
                              onClick={() => openTaskModal(lead)}
                              className={`px-2 py-2 bg-gradient-to-r ${stage.color} text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1`}
                            >
                              <Plus size={11} /> Action
                            </button>
                          </div>
                        </div>
                      )}

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
  ), [scoredLeads, searchQuery, unmappedLeads, showInfoFor, glowingLeadId, filterSortBy, user, currentTime, getLeadsForStage, handleAction, togglePin, openEditModal, deleteLead, updateLeadStage, openNoteModal, openTaskModal, deleteTask, deleteRecentNote, getLeadHighlightClass, openLeadDetails, pipelineCardViewMode]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background relative w-full h-full" key="pipeline-root">
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
      {/* ===== COMPACT HEADER ROW: Pipeline + unmapped + duplicates + Add Lead in ONE row ===== */}
      <div className="flex items-center justify-between gap-2 mb-1.5 sticky top-0 z-30 bg-background/95 backdrop-blur-md px-3 py-2 border-b border-border shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-none shrink-0">Pipeline</h1>
          <button
            onClick={() => setShowPipelineInfo(true)}
            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            title="About pipeline stages"
          >
            <Info size={15} />
          </button>
          {unmappedLeads.length > 0 && (
            <span className="text-[9px] sm:text-[10px] text-amber-500 font-bold uppercase tracking-widest truncate">
              ⚠ {unmappedLeads.length} Unmapped
            </span>
          )}
          {duplicateAnalysis.totalGroupCount > 0 && (
            <button
              onClick={() => setIsDuplicateModalOpen(true)}
              className="text-[9px] sm:text-[10px] text-amber-400 font-bold uppercase tracking-widest hover:text-amber-300 truncate shrink-0"
            >
              • Duplicates ({duplicateAnalysis.totalGroupCount})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Prominent Desktop View Type Switcher in Header */}
          <div className="hidden md:flex items-center gap-1 bg-background/80 border border-input rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                pipelineCardViewMode === 'compact'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Compact View: sleek uniform tiles with minimized activity badges"
            >
              <Layers size={13} />
              Compact View
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('expanded')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                pipelineCardViewMode === 'expanded'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Detailed View: expanded inline activity previews directly on tiles"
            >
              <Clipboard size={13} />
              Detailed View
            </button>
          </div>

          <Button
            onClick={openAddModal}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs py-1 px-2.5 sm:px-3 h-7 sm:h-8 shadow-md flex items-center gap-1 shrink-0"
          >
            <Plus size={14} />
            <span className="md:hidden">Lead</span>
            <span className="hidden md:inline">Add New Lead</span>
          </Button>
        </div>
      </div>

      {/* ===== COMPACT FILTER / SEARCH / SORT ROW ===== */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 md:mb-2">
        {/* Business & Marketing: show My Leads badge */}
        {isSalesperson && (
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">My Leads</span>
          </div>
        )}

        {/* Compact Search Input */}
        <div className="relative flex-1 min-w-[80px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
          <input
            id="crm-pipeline-search"
            name="searchQuery"
            aria-label="Search in pipeline"
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-7"
          />
        </div>

        {/* Compact Sort Dropdown */}
        <div className="flex items-center gap-1 bg-background border border-input rounded-xl px-2 py-1 shadow-sm shrink-0">
          <ArrowUpDown size={12} className="text-muted-foreground" />
          <select
            id="crm-sort-filter"
            name="sortFilter"
            value={filterSortBy}
            onChange={(e) => setFilterSortBy(e.target.value)}
            className="text-xs font-bold text-foreground bg-transparent focus:outline-none appearance-none cursor-pointer pr-1"
          >
            <option value="Score" className="bg-background text-foreground">Score</option>
            <option value="Newest" className="bg-background text-foreground">Date</option>
          </select>
        </div>

        {/* Dedicated Desktop View Type Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-background border border-input rounded-xl p-0.5 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => handleSetViewMode('compact')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pipelineCardViewMode === 'compact'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Compact View: sleek uniform tiles with minimized activity badges"
          >
            <Layers size={13} />
            Compact View
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('expanded')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pipelineCardViewMode === 'expanded'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Detailed View: expanded inline activity previews directly on tiles"
          >
            <Clipboard size={13} />
            Detailed View
          </button>
        </div>
      </div>

      {/* Pipeline stages info sheet (mobile header info icon) */}
      {showPipelineInfo && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPipelineInfo(false)}>
          <div className="bg-card border-t sm:border-2 border-border rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md shadow-2xl p-5 max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black text-foreground tracking-tight">Pipeline Stages</h3>
              <button onClick={() => setShowPipelineInfo(false)} className="p-2 hover:bg-background rounded-xl text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-2.5">
              {STAGES.map((s) => (
                <div key={s.key} className="flex items-start gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-gradient-to-br ${s.color}`} />
                  <div>
                    <p className={`text-xs font-black ${s.textColor} uppercase tracking-wider`}>{s.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isMobileViewport && (<>
      {/* ===== MOBILE: Single-Stage Selector (dropdown) ===== */}
      <div className="md:hidden px-3 pt-1 pb-2 relative">
        <button
          onClick={() => setStageDropdownOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-sm font-black uppercase tracking-wider text-white shadow-lg bg-gradient-to-r ${activeMobileStage.color} active:scale-[0.99] transition-transform`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">{activeMobileStage.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-black">
              {mobileStageLeads.length}
            </span>
          </span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${stageDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            ₹{(mobileTotalValue || 0).toLocaleString()}
          </span>
          <button
            onClick={() => {
              const idx = STAGES.findIndex(s => s.key === activeMobileStage.key);
              const next = STAGES[idx + 1];
              if (next) setMobileActiveStage(next.key);
            }}
            disabled={STAGES.findIndex(s => s.key === activeMobileStage.key) >= STAGES.length - 1}
            className="text-[10px] font-black text-primary uppercase tracking-widest disabled:opacity-30 flex items-center gap-0.5 active:scale-95 transition-transform"
          >
            Next Stage <ChevronRight size={12} />
          </button>
        </div>

        {stageDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStageDropdownOpen(false)} />
            <div className="absolute left-3 right-3 top-full z-50 mx-0 mt-1 p-1.5 bg-card border-2 border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              {STAGES.map((s) => {
                const count = getMobileStageLeads(s).length;
                const isActive = s.key === activeMobileStage.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setMobileActiveStage(s.key);
                      setStageDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      isActive ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${s.color}`} />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                      isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== MOBILE: Full-width compact lead cards (one stage at a time) ===== */}
      <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar px-3 pb-24">
        {mobileStageLeads.length === 0 && (
          <div className="border-2 border-dashed border-border/30 rounded-3xl p-10 text-center bg-background/5 mt-2">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Empty Stage</p>
          </div>
        )}
        <div className="space-y-2.5">
          {mobileStageLeads.map((lead) => {
            const hasPhone = !!lead.phone && lead.phone.trim() !== '' && lead.phone.toLowerCase() !== 'none' && lead.phone.toLowerCase() !== 'n/a';
            const hasEmail = !!lead.email && lead.email.trim() !== '' && lead.email.toLowerCase() !== 'none' && lead.email.toLowerCase() !== 'n/a';
            const location = getLeadLocation(lead);
            const leadStageIdx = STAGES.findIndex(s => s.key === lead.status || s.aliases.includes(lead.status));
            const highlightClass = getLeadHighlightClass(lead);
            const isExpanded = expandedLeadId === lead.id;
            const isMoreOpen = activeMoreMenuLeadId === lead.id;
            const company = resolveLeadCompanyName(lead);
            const contact = resolveLeadContactPerson(lead);

            return (
              <Card
                key={lead.id}
                className={`bg-card/90 border-2 border-border border-t-4 rounded-2xl p-3 shadow-md relative overflow-hidden ${highlightClass}`}
              >
                {/* Stage-colored top accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${activeMobileStage.color}`} />

                <button
                  onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-foreground text-[15px] leading-snug truncate">{company}</h4>
                      {contact && contact !== company && contact !== 'Unknown Contact' && (
                        <p className="text-[11px] text-muted-foreground font-semibold truncate">{contact}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className={`text-muted-foreground shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Key info: business type + service interest (imported CSV fields) */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {lead.business_type && (
                      <span className="px-1.5 py-0.5 bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 text-[9px] font-black rounded uppercase tracking-wider">
                        {lead.business_type}
                      </span>
                    )}
                    {lead.service_interest && (
                      <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/25 text-primary text-[9px] font-black rounded uppercase tracking-wider">
                        {lead.service_interest}
                      </span>
                    )}
                  </div>
                  {location && (
                    <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{location}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {lead.propensityScore !== undefined && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        lead.propensityScore >= 75 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        lead.propensityScore >= 40 ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                        'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        {lead.propensityScore >= 75 ? <Flame size={10} /> :
                         lead.propensityScore >= 40 ? <Zap size={10} /> :
                         <Snowflake size={10} />}
                        Score: {lead.propensityScore}
                      </span>
                    )}
                    {(lead.estimated_value || 0) > 0 && (
                      <span className={`text-[10px] font-black ${activeMobileStage.textColor}`}>₹{(lead.estimated_value || 0).toLocaleString()}</span>
                    )}
                  </div>
                </button>

                {/* Inline quick-action icons (website / maps) */}
                {(lead.website || lead.external_link) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {lead.website && (
                      <a href={formatUrl(lead.website)} target="_blank" rel="noopener noreferrer"
                         className="p-1.5 bg-indigo-600/10 border border-indigo-500/25 text-indigo-500 rounded-lg hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                         title="Visit Website">
                        <Globe size={14} />
                      </a>
                    )}
                    {lead.external_link && (
                      <a href={formatUrl(lead.external_link)} target="_blank" rel="noopener noreferrer"
                         className="p-1.5 bg-rose-600/10 border border-rose-500/25 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                         title="Google Maps">
                        <MapPin size={14} />
                      </a>
                    )}
                  </div>
                )}

                {/* Upcoming scheduled action — ALWAYS visible (desktop parity, no hunting) */}
                {lead.crm_tasks?.filter((t: Record<string, any>) => t.status === 'Pending').length > 0 && (
                  <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Upcoming Action</p>
                    {lead.crm_tasks
                      .filter((t: Record<string, any>) => t.status === 'Pending')
                      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                      .slice(0, 1)
                      .map((task: Record<string, any>) => (
                        <div key={task.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Clock size={11} className="text-amber-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-foreground truncate">{task.title}</p>
                                <p className="text-[9px] text-muted-foreground font-semibold uppercase">
                                  {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={googleCalendarService.generateGoogleCalendarLink(task)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                                title="Add to Google Calendar"
                              >
                                <Calendar size={10} /> Add
                              </a>
                              <a
                                href={googleCalendarService.generateGmailComposeLink(
                                  task,
                                  lead.email || '',
                                  googleCalendarService.generateGoogleCalendarLink(task)
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                                title="Compose Gmail invitation"
                              >
                                <Mail size={10} /> Invite
                              </a>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 shrink-0"
                                title="Delete Action"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Recent note — ALWAYS visible, clamped to 3 lines (desktop parity) */}
                {lead.notes && (
                  <div className="mt-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                        <Clipboard size={10} /> Recent Note
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRecentNote(lead); }}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
                      {lead.notes.split('\n\n---\n\n')[0].trim()}
                    </p>
                  </div>
                )}

                {/* Contact actions: Call / WhatsApp / Mail (desktop parity) */}
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    disabled={!hasPhone}
                    onClick={() => handleAction('call', lead.phone)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      hasPhone ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'opacity-30 bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <Phone size={13} />
                    <span className="text-[11px] font-bold">Call</span>
                  </button>
                  <button
                    disabled={!hasPhone}
                    onClick={() => handleAction('wa', lead.phone)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      hasPhone ? 'bg-[#25D366] hover:bg-[#22c35e] text-white' : 'opacity-30 bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <MessageCircle size={13} />
                    <span className="text-[11px] font-bold">WhatsApp</span>
                  </button>
                  <button
                    disabled={!hasEmail}
                    onClick={() => handleAction('mail', lead.email)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      hasEmail ? 'bg-[#EA4335] hover:bg-[#d93025] text-white' : 'opacity-30 bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                    title={hasEmail ? 'Send Email' : 'Email address not available'}
                  >
                    <Mail size={13} />
                    <span className="text-[11px] font-bold">Mail</span>
                  </button>
                </div>

                {/* Workflow actions: Log Note / Schedule Action / More */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => openNoteModal(lead)}
                    className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 bg-background border border-border text-muted-foreground hover:bg-muted/50 transition-all active:scale-95"
                  >
                    <Clipboard size={13} />
                    <span className="text-[11px] font-bold">Log Note</span>
                  </button>
                  <button
                    onClick={() => openTaskModal(lead)}
                    className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 bg-gradient-to-r ${activeMobileStage.color} text-white transition-all active:scale-95`}
                  >
                    <Plus size={13} />
                    <span className="text-[11px] font-bold">Schedule</span>
                  </button>
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMoreMenuLeadId(isMoreOpen ? null : lead.id); }}
                      className={`h-[34px] px-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
                        isMoreOpen ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground'
                      }`}
                      title="More actions"
                    >
                      <MoreHorizontal size={15} />
                      <span className="text-[11px] font-bold">More</span>
                    </button>
                    {isMoreOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={closeMoreMenu} />
                        <div className="absolute right-0 bottom-full mb-2 z-50 w-44 p-1.5 bg-card border-2 border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {[
                            { icon: <Edit2 size={14} />, label: 'Edit Lead', onClick: () => { closeMoreMenu(); openEditModal(lead); } },
                            { icon: <Pin size={14} />, label: lead.is_pinned ? 'Unpin' : 'Pin to Top', onClick: () => { closeMoreMenu(); togglePin(lead.id, !!lead.is_pinned); } },
                            { icon: <ChevronLeft size={14} />, label: 'Move Back', disabled: STAGES.findIndex(s => s.key === activeMobileStage.key) === 0, onClick: () => { closeMoreMenu(); updateLeadStage(lead.id, lead.status, 'backward'); } },
                            { icon: <ChevronRight size={14} />, label: 'Move Forward', disabled: STAGES.findIndex(s => s.key === activeMobileStage.key) >= STAGES.length - 1, onClick: () => { closeMoreMenu(); updateLeadStage(lead.id, lead.status, 'forward'); } },
                            { icon: <Trash2 size={14} />, label: 'Delete', danger: true, onClick: () => { closeMoreMenu(); deleteLead(lead.id); } },
                          ].filter(Boolean).map((item: any, i: number) => (
                            <button
                              key={i}
                              disabled={item.disabled}
                              onClick={item.onClick}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left disabled:opacity-30 disabled:cursor-not-allowed ${
                                item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-foreground hover:bg-muted/50'
                              }`}
                            >
                              {item.icon} {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded details (tap card to reveal) */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2">
                    {lead.business_type && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Type:</span> {lead.business_type}</p>
                    )}
                    {hasEmail && (
                      <p className="text-[11px] text-muted-foreground truncate"><span className="font-bold uppercase tracking-wider text-[9px]">Email:</span> {lead.email}</p>
                    )}
                    {hasPhone && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Phone:</span> {lead.phone}</p>
                    )}
                    {lead.assigned_user && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Owner:</span> {lead.assigned_user.full_name || lead.assigned_user.username}</p>
                    )}
                    {lead.source && (
                      <p className="text-[11px] text-muted-foreground truncate"><span className="font-bold uppercase tracking-wider text-[9px]">Source:</span> {lead.source}</p>
                    )}
                    {(lead.comment_on_business || lead.custom_data?.comment_on_business) && (
                      <div className="p-3 bg-slate-900/95 border-2 border-amber-500/50 rounded-xl space-y-1 shadow-md">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={13} className="text-amber-400" /> Comment on Business
                        </p>
                        <p className="text-xs text-white font-semibold whitespace-pre-wrap leading-relaxed">
                          {lead.comment_on_business || lead.custom_data?.comment_on_business}
                        </p>
                      </div>
                    )}
                    {Number(lead.budget || 0) > 0 && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Budget:</span> ₹{Number(lead.budget || 0).toLocaleString()}</p>
                    )}
                    {lead.payment_status && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Payment:</span> {lead.payment_status}</p>
                    )}
                    {lead.follow_up_date && (
                      <p className="text-[11px] text-muted-foreground"><span className="font-bold uppercase tracking-wider text-[9px]">Follow-Up:</span> {new Date(lead.follow_up_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    )}
                    {lead.tags && (
                      <p className="text-[11px] text-muted-foreground truncate"><span className="font-bold uppercase tracking-wider text-[9px]">Tags:</span> {lead.tags}</p>
                    )}
                    {lead.custom_data && Object.entries(lead.custom_data).filter(([k, v]) =>
                      !['import_batch_id', 'import_filename', 'imported_at'].includes(k) && v !== null && String(v).trim() !== ''
                    ).length > 0 && (
                      <div className="p-2 bg-background border border-border/60 rounded-xl space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Imported Data</p>
                        {Object.entries(lead.custom_data)
                          .filter(([k, v]) => !['import_batch_id', 'import_filename', 'imported_at'].includes(k) && v !== null && String(v).trim() !== '')
                          .map(([k, v]) => (
                            <div key={k} className="flex items-start justify-between gap-2 text-[10px]">
                              <span className="text-muted-foreground font-semibold truncate max-w-[45%]">{k}</span>
                              <span className="text-foreground font-bold text-right break-words max-w-[55%]">{String(v)}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Stage movement (parity with desktop hover arrows) */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateLeadStage(lead.id, lead.status, 'backward')}
                        disabled={leadStageIdx <= 0}
                        className="px-2 py-2.5 bg-background border border-border rounded-xl font-black text-[10px] uppercase tracking-wider text-muted-foreground transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={12} /> Move Back
                      </button>
                      <button
                        onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                        disabled={leadStageIdx >= STAGES.length - 1}
                        className={`px-2 py-2.5 bg-gradient-to-r ${activeMobileStage.color} text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        Move Forward <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      </>)}

      {/* Pipeline Board (desktop / tablet) — only mounted above the mobile breakpoint */}
      {!isMobileViewport && memoizedPipelineBoard}

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
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
                  <label htmlFor="lead_company_name" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Company Name *</label>
                  <input 
                    id="lead_company_name"
                    name="company_name"
                    type="text" 
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="e.g. TechFlow Pvt Ltd"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lead_contact_person" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Contact Name</label>
                  <input 
                    id="lead_contact_person"
                    name="contact_person"
                    type="text" 
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="lead_email" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Email Address</label>
                <input 
                  id="lead_email"
                  name="email"
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="contact@company.com"
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="lead_estimated_value" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Value (₹)</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-base">₹</div>
                    <input 
                      id="lead_estimated_value"
                      name="estimated_value"
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
                  <label htmlFor="lead_phone" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Phone</label>
                  <input 
                    id="lead_phone"
                    name="phone"
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
                  <label htmlFor="lead_website" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Website Link</label>
                  <input 
                    id="lead_website"
                    name="website"
                    type="text" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="company.com"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lead_external_link" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Google Maps Link / Address</label>
                  <input 
                    id="lead_external_link"
                    name="external_link"
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
                  <label htmlFor="lead_service_interest" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Service Interest</label>
                  <input 
                    id="lead_service_interest"
                    name="service_interest"
                    type="text" 
                    value={formData.service_interest}
                    onChange={(e) => setFormData({...formData, service_interest: e.target.value})}
                    placeholder="e.g. Web Development, SEO"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="lead_business_type" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Business Category / Type</label>
                  <input 
                    id="lead_business_type"
                    name="business_type"
                    type="text" 
                    value={formData.business_type}
                    onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                    placeholder="e.g. Gym, Salon, Restaurant, Electrician"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>
              </div>

              {/* Comment on the Business / Key Points */}
              <div className="space-y-1.5">
                <label htmlFor="lead_comment_on_business" className="text-xs font-black text-amber-400 uppercase tracking-widest ml-1 flex items-center gap-1.5 cursor-pointer">
                  <Building2 size={14} className="text-amber-400" />
                  Comment on the Business (Key Points)
                </label>
                <textarea 
                  id="lead_comment_on_business"
                  name="comment_on_business"
                  value={formData.comment_on_business}
                  onChange={(e) => setFormData({...formData, comment_on_business: e.target.value})}
                  placeholder="Key points about this business (e.g. business model, pain points, company highlights, special requirements)..."
                  rows={3}
                  className="w-full px-5 py-3.5 bg-slate-900 border-2 border-slate-700 focus:border-amber-400 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-semibold custom-scrollbar" 
                />
              </div>

              {isAdmin && (
                <div className="space-y-1">
                  <label htmlFor="lead_assigned_to" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Owner Assignment</label>
                  <select 
                    id="lead_assigned_to"
                    name="assigned_to"
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
              )}

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
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-border flex items-center justify-between bg-background/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Log Client Interaction</h2>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">For {resolveLeadCompanyName(selectedLeadForNote)}</p>
              </div>
              <button onClick={() => setIsNoteModalOpen(false)} className="p-2 hover:bg-background rounded-xl transition-colors text-muted-foreground"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleNoteSubmit} className="p-5 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="note_interaction_type" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Interaction Type</label>
                    <select 
                      id="note_interaction_type"
                      name="interaction_type"
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
                    <label htmlFor="note_sentiment" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Client Sentiment</label>
                    <select 
                      id="note_sentiment"
                      name="sentiment"
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
                  <label htmlFor="note_discussion_points" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Key Discussion Points *</label>
                  <textarea 
                    id="note_discussion_points"
                    name="discussion_points"
                    value={noteFormData.discussion_points}
                    onChange={(e) => setNoteFormData({...noteFormData, discussion_points: e.target.value})}
                    placeholder="What did they say? What was requested?"
                    rows={3}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium custom-scrollbar" 
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="note_next_steps" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Agreed Next Steps</label>
                  <input 
                    id="note_next_steps"
                    name="next_steps"
                    type="text" 
                    value={noteFormData.next_steps}
                    onChange={(e) => setNoteFormData({...noteFormData, next_steps: e.target.value})}
                    placeholder="e.g., Send pricing spreadsheet tomorrow"
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium" 
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="note_additional_notes" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Additional Notes</label>
                  <textarea 
                    id="note_additional_notes"
                    name="additional_notes"
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
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[95vh] flex flex-col">
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
                    <label htmlFor="task_type" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Action Type</label>
                    <select 
                      id="task_type"
                      name="task_type"
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
                      <label htmlFor="custom_task_type" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Custom Action Name *</label>
                      <input 
                        id="custom_task_type"
                        name="custom_task_type"
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
                    <label htmlFor="scheduled_date" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Schedule Date</label>
                    <input 
                      id="scheduled_date"
                      name="scheduled_date"
                      type="date" 
                      value={taskFormData.scheduled_date}
                      onChange={(e) => setTaskFormData({...taskFormData, scheduled_date: e.target.value})}
                      className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="scheduled_time" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Schedule Time (12h)</label>
                    <div className="flex gap-1 sm:gap-2">
                      <input 
                        id="scheduled_time"
                        name="scheduled_time"
                        type="time" 
                        value={taskFormData.scheduled_time}
                        onChange={(e) => setTaskFormData({...taskFormData, scheduled_time: e.target.value})}
                        className="min-w-0 flex-1 px-3 sm:px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                      />
                      <select 
                        id="scheduled_ampm"
                        name="scheduled_ampm"
                        aria-label="Schedule AM or PM"
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
                  <label htmlFor="task_title" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Action Title</label>
                  <input 
                    id="task_title"
                    name="title"
                    type="text" 
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                    placeholder="e.g. Discuss new requirements"
                    className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold" 
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="task_notes" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 cursor-pointer">Action Notes</label>
                  <textarea 
                    id="task_notes"
                    name="notes"
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
                      <label htmlFor="sync_google_cal" className="text-[11px] font-black text-foreground cursor-pointer flex items-center gap-2 uppercase tracking-wider">
                        <input
                          id="sync_google_cal"
                          name="syncToGoogle"
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
                          <label htmlFor="sync_account" className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1 cursor-pointer">Select Google Account</label>
                          <select
                            id="sync_account"
                            name="syncAccount"
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
                          <label htmlFor="attendees_input" className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-1 cursor-pointer">Attendees (comma-separated emails)</label>
                          <input
                            id="attendees_input"
                            name="attendeesInput"
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

      {/* Dedicated Lead Intel & Activity Details Popup Modal (Clean Glassmorphic & Solid Color System) */}
      {activeDetailsLead && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setActiveDetailsLead(null)}
        >
          <div 
            className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 w-full max-w-2xl mx-auto rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold text-white bg-gradient-to-r ${(STAGES.find(s => s.key === activeDetailsLead.status) || STAGES[0]).color}`}>
                    {activeDetailsLead.status}
                  </span>
                  {activeDetailsLead.business_type && (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {activeDetailsLead.business_type}
                    </span>
                  )}
                  {activeDetailsLead.service_interest && (
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {activeDetailsLead.service_interest}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {resolveLeadCompanyName(activeDetailsLead)}
                </h2>
                {resolveLeadContactPerson(activeDetailsLead) && resolveLeadContactPerson(activeDetailsLead) !== resolveLeadCompanyName(activeDetailsLead) && (
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Contact: {resolveLeadContactPerson(activeDetailsLead)}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setActiveDetailsLead(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shrink-0"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Action & Contact Strip */}
            <div className="px-5 sm:px-6 py-3 bg-slate-950/20 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {activeDetailsLead.phone && (
                  <>
                    <button 
                      onClick={() => handleAction('call', activeDetailsLead.phone)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Phone size={12} /> Call
                    </button>
                    <button 
                      onClick={() => handleAction('wa', activeDetailsLead.phone)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                  </>
                )}
                {activeDetailsLead.email && (
                  <button 
                    onClick={() => handleAction('mail', activeDetailsLead.email)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Mail size={12} /> Email
                  </button>
                )}
                {activeDetailsLead.website && (
                  <a 
                    href={formatUrl(activeDetailsLead.website)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Globe size={12} /> Website
                  </a>
                )}
                {activeDetailsLead.external_link && (
                  <a 
                    href={formatUrl(activeDetailsLead.external_link)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <MapPin size={12} /> Maps
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const leadToEdit = activeDetailsLead;
                    setActiveDetailsLead(null);
                    openEditModal(leadToEdit);
                  }}
                  className="h-8 px-3 text-xs font-medium gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <Edit2 size={12} /> Edit Lead
                </Button>
              </div>
            </div>

            {/* Clean Segmented Tabs */}
            <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/20">
              <div className="p-1 bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800 flex items-center gap-1 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setActiveDetailsTab('all')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors shrink-0 font-medium ${
                    activeDetailsTab === 'all'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  All Details
                </button>
                <button
                  onClick={() => setActiveDetailsTab('comment')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 font-medium ${
                    activeDetailsTab === 'comment'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Building2 size={13} className="text-amber-400" />
                  Comment on Business
                </button>
                <button
                  onClick={() => setActiveDetailsTab('schedule')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 font-medium ${
                    activeDetailsTab === 'schedule'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Clock size={13} className="text-sky-400" />
                  Schedules &amp; Actions
                </button>
                <button
                  onClick={() => setActiveDetailsTab('notes')}
                  className={`px-3.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 font-medium ${
                    activeDetailsTab === 'notes'
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Clipboard size={13} className="text-indigo-400" />
                  Logged Notes
                </button>
              </div>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              
              {/* 1. Comment on Business Section */}
              {(activeDetailsTab === 'all' || activeDetailsTab === 'comment') && (
                <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Comment on the Business
                        </h3>
                        <p className="text-[11px] text-slate-400 font-normal">Key highlights, operational requirements and notes</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <textarea 
                      value={detailsEditingComment}
                      onChange={(e) => setDetailsEditingComment(e.target.value)}
                      placeholder="Add key highlights about this business, pain points, company requirements, operational details..."
                      rows={4}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-slate-600 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-colors font-normal custom-scrollbar"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveDetailsComment}
                        disabled={isSavingDetailsComment}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {isSavingDetailsComment ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Save Comment
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Scheduled Actions & Calendar Section */}
              {(activeDetailsTab === 'all' || activeDetailsTab === 'schedule') && (
                <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Clock size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Scheduled Actions &amp; Calendar
                        </h3>
                        <p className="text-[11px] text-slate-400 font-normal">Upcoming actions and scheduled reminders</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetLead = activeDetailsLead;
                        openTaskModal(targetLead);
                      }}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-lg transition-colors gap-1.5"
                    >
                      <Plus size={13} /> Schedule Action
                    </Button>
                  </div>

                  {activeDetailsLead.crm_tasks && activeDetailsLead.crm_tasks.filter((t: any) => t.status === 'Pending').length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {activeDetailsLead.crm_tasks
                        .filter((t: any) => t.status === 'Pending')
                        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .map((task: any) => (
                          <div 
                            key={task.id} 
                            className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="text-sky-400 font-medium">
                                  {new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {task.due_time && <span>@ {task.due_time.substring(0, 5)}</span>}
                                {task.priority && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    {task.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a 
                                href={googleCalendarService.generateGoogleCalendarLink(task)}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Calendar size={12} /> Google Cal
                              </a>
                              <a 
                                href={googleCalendarService.generateGmailComposeLink(
                                  task,
                                  activeDetailsLead.email || '',
                                  googleCalendarService.generateGoogleCalendarLink(task)
                                )}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Mail size={12} /> Invite
                              </a>
                              <button 
                                onClick={async () => {
                                  await deleteTask(task.id);
                                  setActiveDetailsLead(prev => prev ? {
                                    ...prev,
                                    crm_tasks: (prev.crm_tasks || []).filter((t: any) => t.id !== task.id)
                                  } : null);
                                }}
                                className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-md transition-colors"
                                title="Delete Action"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      No upcoming actions scheduled for this lead.
                    </p>
                  )}
                </div>
              )}

              {/* 3. Logged Interaction Notes Section */}
              {(activeDetailsTab === 'all' || activeDetailsTab === 'notes') && (
                <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Clipboard size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Logged Notes &amp; History
                        </h3>
                        <p className="text-[11px] text-slate-400 font-normal">Recorded interaction notes and discussion history</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const targetLead = activeDetailsLead;
                        openNoteModal(targetLead);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition-colors gap-1.5"
                    >
                      <Plus size={13} /> Log Note
                    </Button>
                  </div>

                  {activeDetailsLead.notes ? (
                    <div className="space-y-2.5 pt-1">
                      {activeDetailsLead.notes.split('\n\n---\n\n').map((noteEntry: string, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                          {noteEntry}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      No interaction notes recorded yet.
                    </p>
                  )}
                </div>
              )}

              {/* 4. Financial & Overview Section */}
              {activeDetailsTab === 'all' && (
                <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Financial &amp; Account Overview
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Est. Value</p>
                      <p className="text-base font-bold text-white mt-0.5">₹{Number(activeDetailsLead.estimated_value || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Budget</p>
                      <p className="text-base font-bold text-white mt-0.5">₹{Number(activeDetailsLead.budget || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Score</p>
                      <p className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                        <Flame size={14} className="text-emerald-400" />
                        {activeDetailsLead.propensityScore || 50}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Owner</p>
                      <p className="text-xs font-semibold text-slate-200 mt-1 truncate">{activeDetailsLead.assigned_user?.full_name || activeDetailsLead.assigned_user?.username || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/40 backdrop-blur-md flex justify-end">
              <Button
                variant="outline"
                onClick={() => setActiveDetailsLead(null)}
                className="h-8 px-4 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
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
