import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { OomaLogo } from '@/components/OomaLogo';
import { 
  Plus, Search, X, Phone, Mail, Trash2, ArrowRight, ArrowLeft, Building, User, 
  ListTodo, Send, LayoutDashboard, Briefcase, 
  CheckSquare, TrendingUp, Clock, IndianRupee, Edit, MessageCircle, Calendar, Upload, Loader2,
  Globe, MapPin, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';

export default function CRMPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Navigation
  const [activeModule, setActiveModule] = useState<'dashboard' | 'accounts' | 'pipeline' | 'activities'>('pipeline');
  
  // Data
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal & Detail States
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newService, setNewService] = useState('');
  const [newConfidence, setNewConfidence] = useState('25');
  const [newFollowUp, setNewFollowUp] = useState('');
  const [newBusinessType, setNewBusinessType] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newExternalLink, setNewExternalLink] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newSource, setNewSource] = useState('Website');
  const [newTags, setNewTags] = useState('Cold');
  
  // New List State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filterSource, setFilterSource] = useState('All');
  const [filterTag, setFilterTag] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  
  // Selected Lead Sub-States
  const [activities, setActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState('Call');
  const [fetchingActivities, setFetchingActivities] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STAGES = ['New Leads', 'Contacted', 'Qualified', 'Interested', 'Proposal Sent', 'Negotiation', 'Won (Converted)', 'Onboarding', 'Completed', 'Lost'];

const STAGE_TACTICS: Record<string, string[]> = {
  'New Leads': ['Initial Contact', 'Research'],
  'Contacted': ['Follow Up'],
  'Qualified': ['Assess Needs', 'Budget Match'],
  'Interested': ['Schedule Pitch'],
  'Proposal Sent': ['Follow Up', 'Review Terms'],
  'Negotiation': ['Discuss Pricing', 'Finalize'],
  'Won (Converted)': ['Setup Project'],
  'Onboarding': ['Client Intake', 'Kickoff'],
  'Completed': ['Review', 'Testimonials'],
  'Lost': ['Post-Mortem']
};

  useEffect(() => {
    if (user?.workspace_id) {
      fetchLeads();
      fetchAllTasks();
    }
  }, [user]);

  useEffect(() => {
    if (selectedLead) {
      fetchActivities(selectedLead.id);
    }
  }, [selectedLead]);

  // --- API FETCHERS ---

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('workspace_id', user?.workspace_id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      const cleanData = (data || []).map(opt => ({
        ...opt,
        status: opt.status === 'New Lead' || opt.status === 'New' ? 'New Leads' : 
                opt.status === 'Won' ? 'Won (Converted)' : 
                opt.status === 'Not Interested' ? 'Lost' : 
                opt.status === 'Meeting Pending' ? 'Interested' : 
                opt.status === 'Proposal' ? 'Proposal Sent' : 
                opt.status === 'Follow-Up' ? 'Contacted' : opt.status
      }));
      setLeads(cleanData);
    } catch (err: any) {
      toast.error('Failed to load accounts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTasks = async () => {
    setFetchingActivities(true);
    try {
      const { data, error } = await supabase
        .from('crm_tasks')
        .select(`*, crm_leads(company_name)`)
        .eq('workspace_id', user?.workspace_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Task fetch error", err);
    } finally {
      setFetchingActivities(false);
    }
  };

  const fetchActivities = async (leadId: string) => {
    setFetchingActivities(true);
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*') 
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setFetchingActivities(false);
    }
  };

  // --- ACTIONS ---

  const resetForm = () => {
    setNewCompany(''); setNewContact(''); setNewEmail(''); setNewPhone(''); setNewValue(''); setNewConfidence('25'); setNewService(''); setNewFollowUp(''); setNewBusinessType(''); setNewWebsite(''); setNewExternalLink(''); setNewNotes(''); setNewSource('Website'); setNewTags('Cold'); setIsEditMode(false); setEditLeadId(null);
  };

  const openEditModal = (lead: any) => {
    setIsEditMode(true);
    setEditLeadId(lead.id);
    setNewCompany(lead.company_name);
    setNewContact(lead.contact_person);
    setNewEmail(lead.email || '');
    setNewPhone(lead.phone || '');
    setNewValue((lead.estimated_value || 0).toString());
    setNewConfidence((lead.confidence || 25).toString());
    setNewService(lead.service_interest || '');
    setNewFollowUp(lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : '');
    setNewBusinessType(lead.business_type || '');
    setNewWebsite(lead.website || '');
    setNewExternalLink(lead.external_link || '');
    setNewNotes(lead.notes || '');
    setNewSource(lead.source || 'Website');
    setNewTags(lead.tags || 'Cold');
    setIsNewLeadModalOpen(true);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newContact) { toast.error('Company and Contact Name are required.'); return; }
    setSubmitting(true);
    const payload = {
      company_name: newCompany, contact_person: newContact, email: newEmail, phone: newPhone,
      estimated_value: parseInt(newValue) || 0, confidence: parseInt(newConfidence) || 25, service_interest: newService,
      follow_up_date: newFollowUp ? new Date(newFollowUp).toISOString() : null, workspace_id: user?.workspace_id,
      business_type: newBusinessType, website: newWebsite, external_link: newExternalLink, notes: newNotes,
      source: newSource, tags: newTags
    };
    try {
      if (isEditMode && editLeadId) {
        const { error } = await supabase.from('crm_leads').update(payload).eq('id', editLeadId);
        if (error) throw error;
        toast.success('Account updated successfully!');
      } else {
        const { error } = await supabase.from('crm_leads').insert([{ ...payload, status: 'New Leads' }]);
        if (error) throw error;
        toast.success('Account created successfully!');
      }
      setIsNewLeadModalOpen(false);
      resetForm();
      fetchLeads();
    } catch (err: any) { toast.error('Failed to save account'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ status: newStatus, last_activity_at: new Date().toISOString() })
        .eq('id', leadId);
      
      if (error) throw error;
      toast.success(`Moved to ${newStatus}`);
      
      // ZOHO LOGIC: Auto-Task Engine
      const workflowTasks: Record<string, {title: string, priority: string, category: string}> = {
        'New Lead': { title: 'Initial Outreach & Qualification', priority: 'High', category: 'Call' },
        'Contacted': { title: 'Follow-up on discovery status', priority: 'Medium', category: 'Task' },
        'Follow-Up': { title: 'Pitch Deck & Portfolio Review', priority: 'High', category: 'Meeting' },
        'Meeting Pending': { title: 'Send Calendar Invite & Confirm', priority: 'High', category: 'Meeting' },
        'Proposal Sent': { title: 'Terms Negotiation & Follow-up', priority: 'High', category: 'Call' },
        'Onboarding': { title: 'Welcome Call & Asset Request', priority: 'High', category: 'Meeting' }
      };

      if (workflowTasks[newStatus]) {
        await supabase.from('crm_tasks').insert([{
          lead_id: leadId,
          workspace_id: user?.workspace_id,
          title: workflowTasks[newStatus].title,
          priority: workflowTasks[newStatus].priority,
          activity_type: workflowTasks[newStatus].category,
          due_date: new Date(Date.now() + 86400000).toISOString(),
          assigned_to: user?.id
        }]);
        fetchAllTasks();
      }

      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus, last_activity_at: new Date().toISOString() } : l));
      if (selectedLead?.id === leadId) setSelectedLead((prev: any) => ({ ...prev, status: newStatus }));
      
      await supabase.from('crm_activities').insert([
        { lead_id: leadId, user_id: user?.id, activity_type: 'system', description: `Stage moved to ${newStatus}. Auto-task generated.` }
      ]);
      if (selectedLead?.id === leadId) fetchActivities(leadId);

    } catch (err: any) {
      toast.error('Failed to update stage');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('WARNING: Deleting this account will remove all associated notes, deals, and history. Continue?')) return;
    try {
      const { error } = await supabase.from('crm_leads').delete().eq('id', leadId);
      if (error) throw error;
      toast.success('Account deleted');
      fetchLeads();
      setSelectedLead(null);
    } catch (err: any) {
      toast.error('Failure deleting account');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedLead) return;
    try {
      const { error } = await supabase.from('crm_activities').insert([
        { lead_id: selectedLead.id, user_id: user?.id, activity_type: 'note', description: newNote.trim() }
      ]);
      if (error) throw error;
      setNewNote('');
      fetchActivities(selectedLead.id);
    } catch (err: any) {
      toast.error('Failed to save note');
    }
  };

  const handleCreateTask = async (e: React.FormEvent, customData?: any) => {
    if (e) e.preventDefault();
    const title = customData?.title || newTaskTitle.trim();
    if (!title || !selectedLead) return;
    
    try {
      const { error } = await supabase.from('crm_tasks').insert([
        { 
          lead_id: selectedLead.id, 
          workspace_id: user?.workspace_id, 
          title, 
          assigned_to: user?.id,
          priority: customData?.priority || 'Medium',
          due_date: customData?.due_date || new Date(Date.now() + 86400000).toISOString(),
          activity_type: customData?.activity_type || newTaskType
        }
      ]);
      if (error) throw error;
      setNewTaskTitle('');
      fetchAllTasks();
      toast.success('Activity Scheduled');
    } catch (err: any) {
      toast.error('Failed to create activity');
    }
  };

  const updateMilestone = async (leadId: string, milestone: string, status: string) => {
    try {
      const lead = leads.find((l: any) => l.id === leadId);
      if (!lead) return;
      const current = lead.project_milestones_status || { Design: 'Pending', Development: 'Pending', Testing: 'Pending', Delivery: 'Pending' };
      const updated = { ...current, [milestone]: status };
      const { error } = await supabase.from('crm_leads').update({ project_milestones_status: updated }).eq('id', leadId);
      if (error) throw error;
      setLeads(leads.map((l: any) => l.id === leadId ? { ...l, project_milestones_status: updated } : l));
      if (selectedLead?.id === leadId) setSelectedLead((prev: any) => ({ ...prev, project_milestones_status: updated }));
      toast.success(`${milestone}: ${status}`);
    } catch { toast.error('Milestone update failed'); }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const { error } = await supabase.from('crm_tasks').update({ status: 'Completed' }).eq('id', taskId);
      if (error) throw error;
      
      fetchAllTasks();
      toast.success('Activity Completed!');

      // ZOHO LOOP: Force Next Action Prompt
      if (task) {
        const lead = leads.find(l => l.id === task.lead_id);
        if (lead && lead.status !== 'Onboarding' && lead.status !== 'Not Interested') {
          setSelectedLead(lead);
          toast.info('Schedule your next move immediately to keep the deal warm.');
          // Focus the task input if we are in the modal
          const input = document.getElementById('new-task-input');
          if (input) input.focus();
        }
      }
    } catch (err) {
      toast.error('Could not update task');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    toast.info('Analyzing CSV spreadsheet...');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          toast.error('The spreadsheet appears to be empty.');
          return;
        }

        setSubmitting(true);
        try {
          const insertPayloads = rows.map(row => {
            const getField = (patterns: string[]) => {
              const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase())));
              return key ? row[key] : '';
            };

            const company_name = getField(['company', 'business', 'organization', 'account', 'brand']);
            const contact_person = getField(['contact', 'name', 'person', 'lead', 'client']);
            
            if (!company_name && !contact_person) return null;

            return {
              workspace_id: user.workspace_id,
              status: 'New Lead',
              company_name: company_name || 'Unknown Company',
              contact_person: contact_person || 'Unknown Contact',
              email: getField(['email']),
              phone: getField(['phone', 'mobile', 'cell', 'whatsapp']),
              business_type: getField(['type', 'industry', 'niche', 'category']),
              website: getField(['website', 'url', 'site', 'link']),
              external_link: getField(['map', 'external', 'google', 'location']),
              service_interest: getField(['service', 'interest', 'needed', 'requirement', 'job']),
              notes: getField(['note', 'remark', 'comment', 'detail', 'info']),
              estimated_value: parseInt(getField(['value', 'price', 'amount', 'budget']).toString().replace(/\D/g, '')) || 0,
              confidence: 25
            };
          }).filter((p: any) => p && p.workspace_id);

          if (insertPayloads.length === 0) {
            toast.error('Could not find recognizable data headers. Need at least Company or Contact Name.');
            return;
          }

          const { error } = await supabase.from('crm_leads').insert(insertPayloads);
          if (error) throw error;
          
          toast.success(`Successfully imported ${insertPayloads.length} accounts!`);
          fetchLeads();
        } catch (err: any) {
          toast.error('Failed to import CSV: ' + err.message);
        } finally {
          setSubmitting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  // --- RENDER HELPERS ---
  const activeLeads = leads.filter(l => l.status !== 'Not Interested' && l.status !== 'Onboarding');
  const pipelineValue = activeLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  const weightedPipeline = activeLeads.reduce((sum, lead) => sum + ((lead.estimated_value || 0) * ((lead.confidence || 0) / 100)), 0);

  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);



  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#030303] text-white overflow-hidden selection:bg-indigo-500/30">
      
      {/* MOBILE BOTTOM / DESKTOP LEFT NAVIGATION */}
      <div className="order-last md:order-first w-full md:w-64 h-[65px] md:h-full flex-shrink-0 bg-[#0a0a0d] border-t md:border-t-0 md:border-r border-white/5 flex md:flex-col z-50 transition-all pb-safe">
        <div className="hidden md:flex h-16 border-b border-white/5 items-center justify-start px-6">
           <Link to="/" className="text-gray-500 hover:text-white transition-colors"><ArrowRight className="h-4 w-4 rotate-180" /></Link>
           <h1 className="text-sm font-black text-white uppercase tracking-widest ml-2 flex items-center gap-2"><OomaLogo size={16} /> CRM</h1>
        </div>
        <div className="flex-1 flex flex-row md:flex-col justify-around md:justify-start items-center md:items-stretch md:py-6 px-1 md:px-3 md:space-y-2 h-full w-full">
          <button onClick={() => setActiveModule('dashboard')} className={`flex-1 md:flex-none md:w-full flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-3 py-1.5 md:py-3 rounded-xl transition-all ${activeModule === 'dashboard' ? 'md:bg-indigo-600 md:shadow-lg md:shadow-indigo-600/20 text-indigo-400 md:text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard className="h-5 w-5 md:mr-3 shrink-0 mb-1 md:mb-0" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">Growth Dashboard</span>
          </button>
          <button onClick={() => setActiveModule('accounts')} className={`flex-1 md:flex-none md:w-full flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-3 py-1.5 md:py-3 rounded-xl transition-all ${activeModule === 'accounts' ? 'md:bg-indigo-600 md:shadow-lg md:shadow-indigo-600/20 text-indigo-400 md:text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
            <Building className="h-5 w-5 md:mr-3 shrink-0 mb-1 md:mb-0" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">Leads & Deals</span>
          </button>
          <button onClick={() => setActiveModule('pipeline')} className={`flex-1 md:flex-none md:w-full flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-3 py-1.5 md:py-3 rounded-xl transition-all ${activeModule === 'pipeline' ? 'md:bg-indigo-600 md:shadow-lg md:shadow-indigo-600/20 text-indigo-400 md:text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
            <TrendingUp className="h-5 w-5 md:mr-3 shrink-0 mb-1 md:mb-0" />
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest">Deal Pipeline</span>
          </button>
          <button onClick={() => setActiveModule('activities')} className={`flex-1 md:flex-none md:w-full flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-3 py-1.5 md:py-3 rounded-xl transition-all relative ${activeModule === 'activities' ? 'md:bg-indigo-600 md:shadow-lg md:shadow-indigo-600/20 text-indigo-400 md:text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}>
            <div className="relative">
              <CheckSquare className="h-5 w-5 md:mr-3 shrink-0 mb-1 md:mb-0" />
              {tasks.filter(t => t.status !== 'Completed').length > 0 && (
                <span className="absolute -top-1 -right-2 md:static md:top-auto md:right-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full md:hidden">
                  {tasks.filter(t => t.status !== 'Completed').length}
                </span>
              )}
            </div>
            <span className="text-[10px] md:text-sm font-black uppercase tracking-widest md:flex-1 md:text-left">Activities center</span>
            {tasks.filter(t => t.status !== 'Completed').length > 0 && (
              <span className="hidden md:inline-block bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {tasks.filter(t => t.status !== 'Completed').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed" style={{ backgroundBlendMode: 'overlay', backgroundColor: '#050505' }}>
        
        {/* Dynamic Header */}
        <div className="h-16 px-4 md:px-10 border-b border-white/5 flex items-center justify-between bg-[#0a0a0d]/80 backdrop-blur-xl z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
             <Link to="/" className="text-gray-500 hover:text-white transition-colors md:hidden bg-white/5 p-1.5 rounded-lg"><ArrowRight className="h-4 w-4 rotate-180" /></Link>
             <h2 className="text-base md:text-lg font-black uppercase tracking-widest text-white">
               {activeModule}
             </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="h-10 w-10 sm:w-auto px-0 sm:px-4 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors"
              title="Upload CSV"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{submitting ? 'Importing...' : 'Upload CSV'}</span>
            </button>
            <button 
              onClick={() => { resetForm(); setIsNewLeadModalOpen(true); }}
              className="h-10 px-5 bg-white text-black hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center transition-colors shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2 stroke-[3px]" /> New Lead
            </button>
          </div>
        </div>

        {/* --- DYNAMIC MODULE CONTENT --- */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          
          {/* Progress Overlay for Bulk Uploads */}
          {submitting && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="bg-[#0a0a0d] border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-black uppercase tracking-widest text-white">Syncing Data</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Injecting accounts into pipeline...</p>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD MODULE */}
          {activeModule === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111116] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5"><IndianRupee className="h-24 w-24" /></div>
                   <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Open Pipeline Value</p>
                   <h3 className="text-4xl font-black text-indigo-400">₹{pipelineValue.toLocaleString()}</h3>
                   <div className="mt-4 flex gap-2">
                     <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded font-black uppercase">Weighted: ₹{weightedPipeline.toLocaleString()}</span>
                     <span className="text-[10px] text-gray-400 py-1 font-bold uppercase">{activeLeads.length} Deals</span>
                   </div>
                </div>
                <div className="bg-[#111116] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5"><TrendingUp className="h-24 w-24" /></div>
                   <p className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-2">Total Closed Clients</p>
                   <h3 className="text-5xl font-black text-white">{leads.filter(l => ['Won (Converted)', 'Onboarding', 'Completed'].includes(l.status)).length}</h3>
                   <p className="text-[10px] text-gray-500 font-bold mt-4 uppercase">Successfull Deals on Board</p>
                </div>
                <div className="bg-[#111116] border border-white/5 p-6 rounded-3xl relative overflow-hidden text-right">
                   <div className="absolute top-0 left-0 p-6 opacity-5"><Building className="h-24 w-24" /></div>
                   <p className="text-sm font-black text-indigo-500 uppercase tracking-widest mb-2">Total Leads</p>
                   <h3 className="text-5xl font-black text-white">{leads.length}</h3>
                   <p className="text-[10px] text-gray-500 font-bold mt-4 uppercase">Active prospects in funnel</p>
                </div>
              </div>
              
              <div className="bg-[#0c0c0e] border border-white/5 p-8 rounded-3xl relative">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">Live Conversion Feed</h4>
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full uppercase tracking-widest">Active Tracking</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Won (Converted)', 'Proposal Sent', 'Interested', 'Lost'].map(st => {
                      const count = leads.filter(l => l.status === st).length;
                      const color = st === 'Won (Converted)' ? 'emerald' : st === 'Lost' ? 'red' : st === 'Proposal Sent' ? 'indigo' : 'amber';
                      return (
                        <div key={st} className={`p-5 rounded-2xl border border-${color}-500/10 bg-${color}-500/[0.02] flex flex-col justify-between`}>
                           <p className={`text-[10px] font-black text-${color}-500 uppercase tracking-widest mb-1`}>{st}</p>
                           <h4 className="text-3xl font-black text-white">{count} <span className="text-xs text-gray-600 font-black">FILES</span></h4>
                        </div>
                      )
                    })}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl col-span-1 md:col-span-2">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-500/5 to-transparent">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-indigo-400" /> Daily Workdesk
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Execute your high-priority activities</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    {/* OVERDUE */}
                    <div className="p-6 space-y-4">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-between">Overdue <span>{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0))).length}</span></p>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)))
                          .sort((a, b) => {
                            const prioritizer = (p: string) => p === 'High' ? 2 : p === 'Medium' ? 1 : 0;
                            return prioritizer(b.priority || '') - prioritizer(a.priority || '');
                          })
                          .slice(0,3).map(task => (
                          <div key={task.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => setSelectedLead(leads.find(l => l.id === task.lead_id))}>
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-bold text-gray-200 line-clamp-1">{task.title}</p>
                              {task.priority === 'High' && <span className="text-[7px] bg-red-500 text-white px-1 rounded uppercase font-black">Urgent</span>}
                            </div>
                            <p className="text-[9px] font-black uppercase text-red-400 mt-1 opacity-70">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* TODAY */}
                    <div className="p-6 space-y-4 bg-white/[0.01]">
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center justify-between">Today <span>{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date).toDateString() === new Date().toDateString()).length}</span></p>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date).toDateString() === new Date().toDateString())
                          .sort((a, b) => {
                            const prioritizer = (p: string) => p === 'High' ? 2 : p === 'Medium' ? 1 : 0;
                            return prioritizer(b.priority || '') - prioritizer(a.priority || '');
                          })
                          .slice(0,3).map(task => (
                          <div key={task.id} className="p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setSelectedLead(leads.find(l => l.id === task.lead_id))}>
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-white line-clamp-1">{task.title}</p>
                              <span className={`text-[7px] px-1 rounded uppercase font-black ${task.priority === 'High' ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300'}`}>{task.priority}</span>
                            </div>
                            <p className="text-[9px] font-black uppercase text-indigo-400 mt-1">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* UPCOMING */}
                    <div className="p-6 space-y-4">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-between">Upcoming <span>{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) > new Date(new Date().setHours(23,59,59,999))).length}</span></p>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) > new Date(new Date().setHours(23,59,59,999)))
                          .sort((a, b) => {
                            const prioritizer = (p: string) => p === 'High' ? 2 : p === 'Medium' ? 1 : 0;
                            return prioritizer(b.priority || '') - prioritizer(a.priority || '');
                          })
                          .slice(0,3).map(task => (
                          <div key={task.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl opacity-60">
                            <p className="text-xs font-bold text-gray-400 line-clamp-1">{task.title}</p>
                            <p className="text-[9px] font-black uppercase text-gray-600 mt-1">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111116] border border-white/5 p-6 rounded-3xl">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Recent Accounts</h4>
                  <div className="space-y-4">
                    {leads.slice(0, 5).map(lead => (
                      <div key={lead.id} onClick={() => setSelectedLead(lead)} className="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                            <Building className="h-5 w-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{lead.company_name}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{termLabel(lead.status)}</p>
                          </div>
                        </div>
                        <span className="font-black text-xs text-gray-400 group-hover:text-emerald-400">₹{lead.estimated_value?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEAL PIPELINE MODULE */}
          {activeModule === 'pipeline' && (
            <div className="flex gap-4 md:gap-6 h-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 animate-fade-in">
              {STAGES.map((stage) => {
                const stageLeads = leads.filter(l => l.status === stage);
                const stageValue = stageLeads.reduce((acc, l) => acc + (l.estimated_value||0), 0);
                
                return (
                  <div key={stage} className="w-[320px] flex-shrink-0 flex flex-col bg-[#0c0c0e]/80 backdrop-blur-md rounded-3xl border border-white/5 h-full max-h-full">
                    <div className="p-4 border-b border-white/5 bg-[#0c0c0e]/40">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white flex items-center">
                            {stage} <span className="ml-2 text-gray-600">• {stageLeads.length}</span>
                          </h3>
                          {stageValue > 0 && <p className="text-[10px] text-emerald-400 font-bold mt-1 uppercase">₹{stageValue.toLocaleString()}</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {STAGE_TACTICS[stage]?.map(tactic => (
                          <span key={tactic} className="px-2 py-1 bg-white/5 border border-white/5 rounded-md text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all cursor-default">
                            {tactic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div 
                      className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3"
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/5'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('bg-white/5'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-white/5');
                        const leadId = e.dataTransfer.getData('leadId');
                        if (leadId) handleUpdateStatus(leadId, stage);
                      }}
                    >
                      {stageLeads.map(lead => {
                        const idx = STAGES.indexOf(stage);
                        const getStageColor = (s: string) => {
                          if (s === 'New Leads') return 'sky';
                          if (s === 'Contacted') return 'purple';
                          if (s === 'Qualified') return 'blue';
                          if (s === 'Interested') return 'orange';
                          if (s === 'Proposal Sent') return 'indigo';
                          if (s === 'Negotiation') return 'amber';
                          if (s === 'Won (Converted)' || s === 'Onboarding') return 'emerald';
                          return 'red';
                        };
                        const color = getStageColor(stage);
                        
                        return (
                          <div 
                            key={lead.id} 
                            onClick={() => setSelectedLead(lead)}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                            className={`bg-[#111116] border border-white/10 p-5 sm:p-6 rounded-[2rem] cursor-grab active:cursor-grabbing group relative transition-all duration-300 hover:shadow-2xl overflow-hidden hover:border-${color}-500/50 hover:bg-[#0c0c0e]`}
                          >
                            <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-10 pointer-events-none group-hover:opacity-30 transition-all bg-${color}-500`}></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                              <div className="flex space-x-4 items-center">
                                <div className={`h-12 w-12 shrink-0 rounded-2xl bg-${color}-500/10 flex items-center justify-center border border-${color}-500/20 shadow-inner group-hover:scale-110 transition-transform relative`}>
                                   <Building className={`h-5 w-5 text-${color}-400`} />
                                   
                                   {/* ZOHO TASK INDICATOR */}
                                   {(() => {
                                      const leadTasks = tasks.filter(t => t.lead_id === lead.id && t.status !== 'Completed');
                                      if (leadTasks.some(t => new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0)))) {
                                        return <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-[#111116] animate-pulse shadow-lg shadow-red-500/40" title="Overdue Action Required" />;
                                      }
                                      if (leadTasks.length === 0 && lead.status !== 'Onboarding' && lead.status !== 'Not Interested') {
                                        return <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full border-2 border-[#111116] shadow-lg shadow-amber-500/40" title="No Next Move Set (Zoho Alert)" />;
                                      }
                                      if (leadTasks.length > 0) {
                                        return <div className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 rounded-full border-2 border-[#111116] shadow-lg shadow-indigo-500/40" title="Next Move Scheduled" />;
                                      }
                                      return null;
                                   })()}
                                </div>
                                <div className="min-w-0">
                                   <h4 className="font-black text-base text-white truncate pr-2 tracking-tight">{lead.company_name}</h4>
                                   <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] truncate mt-0.5">{lead.business_type || 'Potential Account'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-black/60 rounded-2xl px-4 py-2.5 border border-white/5 flex justify-between items-center mb-5 relative z-10 backdrop-blur-md">
                               <div className="flex items-center gap-2.5 min-w-0">
                                 <User className="h-4 w-4 text-gray-500 shrink-0" />
                                 <span className="text-xs font-bold text-gray-200 truncate pr-2">
                                   {(!lead.contact_person || lead.company_name.toLowerCase().includes(lead.contact_person.toLowerCase()) || lead.contact_person.toLowerCase().includes(lead.company_name.toLowerCase())) 
                                     ? 'Direct Account' 
                                     : lead.contact_person}
                                 </span>
                               </div>
                               <span className="text-emerald-400 font-black text-base flex items-center shrink-0 tracking-tight pl-2 border-l border-white/10 ml-2">
                                 <IndianRupee className="h-3.5 w-3.5 mr-0.5 opacity-50" />
                                 {(lead.estimated_value || 0).toLocaleString()}
                               </span>
                            </div>
                            
                            <div className="pt-5 border-t border-white/5 relative z-10 space-y-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {lead.phone && (
                                  <a href={`tel:${lead.phone}`} title="Call" className={`flex-1 flex items-center justify-center py-2.5 bg-${color}-500 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-${color}-400/20`}>
                                    <Phone className="h-3.5 w-3.5 mr-2" /> CALL NOW
                                  </a>
                                )}
                                {lead.phone && (
                                  <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" title="WhatsApp" className="h-11 w-11 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all">
                                    <MessageCircle className="h-5 w-5" />
                                  </a>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {lead.email && (
                                    <a href={`mailto:${lead.email}`} title="Email" className="h-9 w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-all border border-white/10">
                                      <Mail className="h-4 w-4" />
                                    </a>
                                  )}
                                  {lead.website && (
                                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" title="Website" className="h-9 w-9 flex items-center justify-center bg-indigo-500/5 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all border border-indigo-500/20">
                                      <Globe className="h-4 w-4" />
                                    </a>
                                  )}
                                  {lead.external_link && (
                                    <a href={lead.external_link.startsWith('http') ? lead.external_link : `https://${lead.external_link}`} target="_blank" rel="noreferrer" title="Maps" className="h-9 w-9 flex items-center justify-center bg-amber-500/5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all border border-amber-500/20">
                                      <MapPin className="h-4 w-4" />
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                  {idx > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(lead.id, STAGES[idx-1]); }} className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-white transition-all">
                                      <ArrowLeft className="h-4 w-4" />
                                    </button>
                                  )}
                                  {idx < STAGES.length - 1 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); if (!['Lost'].includes(STAGES[idx+1])) handleUpdateStatus(lead.id, STAGES[idx+1]); }}
                                      className="h-8 w-8 flex items-center justify-center bg-white text-black hover:bg-indigo-500 hover:text-white rounded-lg transition-all shadow-sm"
                                    >
                                      <ArrowRight className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                      )})}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ACCOUNTS LIST MODULE */}
          {activeModule === 'accounts' && (
            <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
              <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-4 shadow-2xl flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search firm, name, or phone..." className="w-full bg-[#18181e] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all" />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap ml-1 md:ml-0">Sort:</span>
                    <button onClick={() => setSortConfig({ key: 'created_at', direction: 'desc' })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${sortConfig.key === 'created_at' ? 'bg-indigo-500 text-white' : 'bg-[#18181e] text-gray-400 hover:text-white border border-white/5'}`}>Recent</button>
                    <button onClick={() => setSortConfig({ key: 'estimated_value', direction: 'desc' })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${sortConfig.key === 'estimated_value' ? 'bg-indigo-500 text-white' : 'bg-[#18181e] text-gray-400 hover:text-white border border-white/5'}`}>Value</button>
                    <button onClick={() => setSortConfig({ key: 'company_name', direction: 'asc' })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${sortConfig.key === 'company_name' ? 'bg-indigo-500 text-white' : 'bg-[#18181e] text-gray-400 hover:text-white border border-white/5'}`}>Name</button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">Filter:</span>
                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="bg-[#18181e] border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none">
                    <option value="All">All Stages</option>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-[#18181e] border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none">
                    <option value="All">All Sources</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Apollo">Apollo</option>
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                  </select>
                  <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="bg-[#18181e] border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none">
                    <option value="All">All Tags</option>
                    <option value="Hot">Hot</option>
                    <option value="Cold">Cold</option>
                    <option value="High Budget">High Budget</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
                 {(() => {
                      let res = [...leads];
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        res = res.filter(l => (l.company_name?.toLowerCase().includes(q) || l.contact_person?.toLowerCase().includes(q) || l.phone?.includes(q)));
                      }
                      if (filterStage !== 'All') res = res.filter(l => l.status === filterStage);
                      if (filterSource !== 'All') res = res.filter(l => l.source === filterSource);
                      if (filterTag !== 'All') res = res.filter(l => l.tags === filterTag);
                      res.sort((a, b) => {
                         let vA = a[sortConfig.key]; let vB = b[sortConfig.key];
                         if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
                         if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
                         return 0;
                      });
                      return res;
                 })().map(lead => (
                   <div key={lead.id} onClick={() => setSelectedLead(lead)} className="bg-[#111116] border border-white/5 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 rounded-3xl p-5 sm:p-6 transition-all cursor-pointer group flex flex-col relative overflow-hidden h-full">
                     <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-all group-hover:opacity-20 ${
                       lead.status === 'Won' ? 'bg-emerald-500' : lead.status === 'Lost' ? 'bg-red-500' : 'bg-indigo-500'
                     }`}></div>
                     
                     <div className="flex justify-between items-start mb-5 relative z-10">
                       <div className="flex items-center gap-3">
                         <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/10 shadow-inner group-hover:from-indigo-500/30 transition-all">
                           <Building className="h-5 w-5 text-gray-300 group-hover:text-indigo-400" />
                         </div>
                         <div>
                           <h3 className="font-black text-white text-base mb-0.5 group-hover:text-indigo-400 transition-colors line-clamp-1 truncate pe-2">{lead.company_name}</h3>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center"><User className="h-3 w-3 mr-1 opacity-50" /> {lead.contact_person}</p>
                         </div>
                       </div>
                     </div>

                     <div className="flex-1 flex flex-col space-y-3 mb-6 relative z-10">
                        <div className="px-4 py-3.5 bg-black/40 rounded-2xl border border-white/5 flex justify-between items-center backdrop-blur-sm">
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Deal Value</span>
                          <span className="text-xl font-black text-emerald-400 flex items-center tooltip"><IndianRupee className="h-4 w-4 mr-1 opacity-50" />{(lead.estimated_value || 0).toLocaleString()}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                           <div className="px-3 py-2.5 bg-white/[0.02] rounded-2xl border border-white/5">
                             <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex justify-between items-center">Service <span className={`h-2 w-2 rounded-full ${lead.service_interest ? 'bg-indigo-500' : 'bg-gray-700'}`}></span></p>
                             <p className="text-xs text-gray-300 font-bold truncate">{lead.service_interest || '—'}</p>
                           </div>
                           <div className="px-3 py-2.5 bg-white/[0.02] rounded-2xl border border-white/5">
                             <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 flex justify-between items-center">Stage <span className={`h-2 w-2 rounded-full ${lead.status === 'Won (Converted)' ? 'bg-emerald-500' : lead.status === 'Lost' ? 'bg-red-500' : 'bg-amber-500'}`}></span></p>
                             <p className={`text-[10px] font-black uppercase tracking-wider truncate ${lead.status === 'Won (Converted)' ? 'text-emerald-400' : lead.status === 'Lost' ? 'text-red-400' : 'text-amber-400'}`}>{lead.status}</p>
                           </div>
                           <div className="px-3 py-2.5 bg-white/[0.02] rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                             <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Source</p>
                             <p className="text-xs text-indigo-400 font-bold truncate">{lead.source || '—'}</p>
                           </div>
                           <div className="px-3 py-2.5 bg-white/[0.02] rounded-2xl border border-white/5 text-center flex flex-col justify-center">
                             <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Tags</p>
                             <p className={`text-xs font-bold truncate ${lead.tags === 'Hot' ? 'text-amber-500' : lead.tags === 'High Budget' ? 'text-emerald-500' : 'text-blue-400'}`}>{lead.tags || '—'}</p>
                           </div>
                        </div>
                     </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-auto relative z-10" onClick={e => e.stopPropagation()}>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} title="Quick Call" className="flex-1 flex items-center justify-center py-2.5 bg-indigo-500 text-white rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                            <Phone className="h-4 w-4 mr-1.5" /> Call
                          </a>
                        )}
                        <div className="flex items-center gap-1.5">
                          {lead.phone && (
                            <a href={`https://wa.me/${lead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" title="WhatsApp" className="h-10 w-10 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl transition-colors">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} title="Email" className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 text-gray-300 rounded-xl transition-colors">
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                          {lead.website && (
                            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" title="Visit Website" className="h-10 w-10 flex items-center justify-center bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 rounded-xl transition-colors">
                              <Globe className="h-4 w-4" />
                            </a>
                          )}
                          {lead.external_link && (
                            <a href={lead.external_link.startsWith('http') ? lead.external_link : `https://${lead.external_link}`} target="_blank" rel="noreferrer" title="View Maps" className="h-10 w-10 flex items-center justify-center bg-amber-500/5 border border-amber-500/20 text-amber-400 rounded-xl transition-colors">
                              <MapPin className="h-4 w-4" />
                            </a>
                          )}
                          <button onClick={() => setSelectedLead(lead)} className="px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest ml-1 shadow-lg shadow-black/20">
                            Profile
                          </button>
                        </div>
                      </div>

                   </div>
                 ))}
                 {leads.length === 0 && !loading && (
                    <div className="col-span-full py-24 text-center bg-[#111116] border border-white/5 rounded-3xl shadow-2xl">
                      <Briefcase className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                      <p className="text-sm text-gray-500 uppercase font-black tracking-widest">No accounts in the registry.</p>
                      <button onClick={() => { resetForm(); setIsNewLeadModalOpen(true); }} className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-white/10 inline-flex items-center">
                        <Plus className="h-4 w-4 mr-2" /> Add First Account
                      </button>
                    </div>
                 )}
              </div>
            </div>
          )}

          {/* ACTIVITIES MODULE (ZOHO STYLE) */}
          {activeModule === 'activities' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
               <div className="flex justify-between items-center bg-[#111116] p-6 rounded-3xl border border-white/5">
                 <div>
                   <h2 className="text-xl font-black uppercase tracking-tight text-white mb-1">Execution Hub</h2>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Zoho Activities Center • {tasks.filter(t => t.status !== 'Completed').length} Actions Required</p>
                 </div>
                 <div className="flex gap-2">
                    <button className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Focus View</button>
                    <button className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Filter</button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                  {/* OVERDUE */}
                  <div className="flex flex-col bg-black/20 rounded-3xl border border-red-500/10 overflow-hidden">
                     <div className="p-4 bg-red-500/5 border-b border-red-500/10 flex justify-between items-center">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Overdue</span>
                        <span className="h-5 w-5 bg-red-500 text-white text-[9px] font-black rounded flex items-center justify-center">{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0))).length}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0))).map(task => (
                           <div key={task.id} className="p-4 bg-[#111116] border border-white/10 rounded-2xl group hover:border-red-500/40 transition-all cursor-pointer" onClick={() => setSelectedLead(leads.find(l => l.id === task.lead_id))}>
                              <div className="flex justify-between items-center mb-2">
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${task.activity_type === 'Call' ? 'bg-amber-500/20 text-amber-500' : task.activity_type === 'Meeting' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                    {task.activity_type}
                                 </span>
                                 <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="h-6 w-6 rounded-full border border-white/10 flex items-center justify-center hover:bg-emerald-500 transition-all">
                                    <CheckSquare className="h-3 w-3" />
                                 </button>
                              </div>
                              <h4 className="text-sm font-bold text-white line-clamp-1 mb-1">{task.title}</h4>
                              <p className="text-[10px] font-black text-gray-600 uppercase mb-3">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                 <span className="text-[8px] font-black text-red-500 uppercase">Late by {Math.floor((new Date().getTime() - new Date(task.due_date).getTime()) / (1000*60*60*24))} Days</span>
                                 <span className="text-[8px] text-gray-600 uppercase font-black">{new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* TODAY */}
                  <div className="flex flex-col bg-black/20 rounded-3xl border border-amber-500/10 overflow-hidden">
                     <div className="p-4 bg-amber-500/5 border-b border-amber-500/10 flex justify-between items-center">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Today's Execution</span>
                        <span className="h-5 w-5 bg-amber-500 text-black text-[9px] font-black rounded flex items-center justify-center">{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date).toDateString() === new Date().toDateString()).length}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date).toDateString() === new Date().toDateString()).map(task => (
                           <div key={task.id} className="p-4 bg-[#14141d] border border-white/10 rounded-2xl group hover:border-amber-500/40 transition-all cursor-pointer" onClick={() => setSelectedLead(leads.find(l => l.id === task.lead_id))}>
                              <div className="flex justify-between items-center mb-2">
                                 <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${task.activity_type === 'Call' ? 'bg-amber-500/20 text-amber-500' : task.activity_type === 'Meeting' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                       {task.activity_type}
                                    </span>
                                    {task.priority === 'High' && <span className="text-[8px] text-red-500 font-bold animate-pulse">● URGENT</span>}
                                 </div>
                                 <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="h-6 w-6 rounded-full border border-white/10 flex items-center justify-center hover:bg-emerald-500 transition-all shadow-lg">
                                    <CheckSquare className="h-3 w-3" />
                                 </button>
                              </div>
                              <h4 className="text-sm font-bold text-white mb-1">{task.title}</h4>
                              <p className="text-[10px] font-black text-indigo-400 uppercase mb-3">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                 <span className="text-[8px] font-black text-amber-500 uppercase">Priority Execution</span>
                                 <Clock className="h-3 w-3 text-amber-500" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* UPCOMING */}
                  <div className="flex flex-col bg-black/20 rounded-3xl border border-indigo-500/10 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
                     <div className="p-4 bg-indigo-500/5 border-b border-indigo-500/10 flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Upcoming</span>
                        <span className="h-5 w-5 bg-indigo-500 text-white text-[9px] font-black rounded flex items-center justify-center">{tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) > new Date(new Date().setHours(23,59,59,999))).length}</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {tasks.filter(t => t.status !== 'Completed' && new Date(t.due_date) > new Date(new Date().setHours(23,59,59,999))).map(task => (
                           <div key={task.id} className="p-4 bg-[#111116] border border-white/5 rounded-2xl group hover:border-indigo-500/40 transition-all cursor-pointer" onClick={() => setSelectedLead(leads.find(l => l.id === task.lead_id))}>
                              <div className="flex justify-between items-center mb-2">
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${task.activity_type === 'Call' ? 'bg-amber-500/20 text-amber-500' : task.activity_type === 'Meeting' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                    {task.activity_type}
                                 </span>
                              </div>
                              <h4 className="text-sm font-bold text-gray-300 mb-1">{task.title}</h4>
                              <p className="text-[10px] font-black text-gray-600 uppercase">{leads.find(l => l.id === task.lead_id)?.company_name}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* --- OVERLAYS --- */}

      {/* NEW LEAD MODAL */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsNewLeadModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0a0d] rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 animate-slide-up max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button type="button" onClick={() => setIsNewLeadModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl">
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-1">{isEditMode ? 'Edit Account' : 'Incept Deal'}</h2>
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-6">{isEditMode ? 'Modify CRM Entity' : 'Establish new CRM entity'}</p>
            
            <form onSubmit={handleSubmitLead} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Business Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"><Building className="h-4 w-4" /></div>
                    <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 focus:bg-[#181820] outline-none transition-all placeholder:text-gray-600" placeholder="Acme Corp" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Type of Business</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"><Briefcase className="h-4 w-4" /></div>
                    <input type="text" value={newBusinessType} onChange={(e) => setNewBusinessType(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 focus:bg-[#181820] outline-none transition-all placeholder:text-gray-600" placeholder="e.g. E-commerce" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Name</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"><User className="h-4 w-4" /></div>
                    <input type="text" value={newContact} onChange={(e) => setNewContact(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 focus:bg-[#181820] outline-none transition-all placeholder:text-gray-600" placeholder="John Doe" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Service Needed</label>
                  <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-indigo-500 outline-none placeholder:text-gray-600" placeholder="e.g. Web Development" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email Address</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none" placeholder="john@acme.com" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone Number</label>
                  <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none" placeholder="+1..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Website Link</label>
                  <input type="url" value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-indigo-400 focus:border-indigo-500 outline-none placeholder:text-gray-600" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Google Maps / Ext. Link</label>
                  <input type="url" value={newExternalLink} onChange={(e) => setNewExternalLink(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-indigo-400 focus:border-indigo-500 outline-none placeholder:text-gray-600" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notes</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none resize-none h-16 custom-scrollbar" placeholder="Initial details or context..."></textarea>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lead Source</label>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none">
                    <option value="Instagram">Instagram</option>
                    <option value="Apollo">Apollo</option>
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tags</label>
                  <select value={newTags} onChange={(e) => setNewTags(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none">
                    <option value="Hot">Hot</option>
                    <option value="Cold">Cold</option>
                    <option value="High Budget">High Budget</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Budget / Projected Value (₹)</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={newValue} onChange={(e) => setNewValue(e.target.value.replace(/\D/g, ''))} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-emerald-400 focus:border-indigo-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Follow-Up Date</label>
                  <input type="date" value={newFollowUp} onChange={(e) => setNewFollowUp(e.target.value)} className="w-full bg-[#14141a] border border-white/5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white focus:border-indigo-500 outline-none block" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={submitting} className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all disabled:opacity-50 shadow-xl flex justify-center items-center">
                  {submitting ? 'Initializing...' : <><Plus className="h-4 w-4 mr-2" /> Inject To Pipeline</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD PROFILE / DETAIL SLIDE-OVER */}
      {selectedLead && (
        <div className="fixed inset-0 z-[105] flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
          <div className="relative w-full max-w-xl bg-[#08080a] h-full shadow-2xl border-l border-white/10 flex flex-col animate-slide-in-right">
            
            {/* Header Block */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><OomaLogo size={140} /></div>
              
              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${
                    selectedLead.status === 'Won' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' :
                    (selectedLead.status === 'Lost' || selectedLead.status === 'Not Interested') ? 'border-red-500/50 bg-red-500/10 text-red-400' :
                    'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                  }`}>
                    Stage: {selectedLead.status}
                  </span>
                  {['New Lead', 'Contacted'].includes(selectedLead.status) && (
                    <button 
                      onClick={() => handleUpdateStatus(selectedLead.id, 'Meeting Pending')}
                      className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg flex items-center"
                    >
                      <TrendingUp className="h-3 w-3 mr-1.5" /> Convert to Deal
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(selectedLead)} className="p-2.5 bg-indigo-500/5 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-colors"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDeleteLead(selectedLead.id)} className="p-2.5 bg-red-500/5 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                  <button onClick={() => setSelectedLead(null)} className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-colors"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="relative z-10 max-w-full">
                <h2 className="text-xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight mb-3 break-words hyphens-auto">
                  {selectedLead.company_name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                   {selectedLead.contact_person !== selectedLead.company_name && (
                     <p className="text-sm font-bold text-gray-400 flex items-center bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                       <User className="h-4 w-4 mr-2 text-indigo-400" /> 
                       <span className="text-[10px] uppercase tracking-widest text-gray-500 mr-2 font-black">Contact:</span>
                       {selectedLead.contact_person}
                     </p>
                   )}
                   <p className="text-sm font-black text-emerald-400 flex items-center bg-emerald-400/5 px-3 py-1.5 rounded-xl border border-emerald-400/10">
                     <IndianRupee className="h-4 w-4 mr-1" /> {selectedLead.estimated_value?.toLocaleString() || '0'}
                   </p>
                   {selectedLead.service_interest && (
                     <>
                       <span className="hidden sm:block w-1 h-1 bg-white/20 rounded-full"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{selectedLead.service_interest}</span>
                     </>
                   )}
                   {selectedLead.confidence && (
                     <>
                       <span className="hidden sm:block w-1 h-1 bg-white/20 rounded-full"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-1 rounded">{selectedLead.confidence}% Win Rate</span>
                     </>
                   )}
                   {selectedLead.follow_up_date && (
                      <>
                        <span className="hidden sm:block w-1 h-1 bg-white/20 rounded-full"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex items-center"><Calendar className="h-3 w-3 mr-1" /> Follow Up: {new Date(selectedLead.follow_up_date).toLocaleDateString()}</span>
                      </>
                    )}
                </div>
                
                {/* STAGE TRACKER */}
                <div className="mt-8 flex items-center gap-1">
                  {STAGES.map((s, idx) => {
                    const activeIdx = STAGES.indexOf(selectedLead.status);
                    const isCompleted = idx <= activeIdx;
                    const isCurrent = idx === activeIdx;
                    return (
                      <div key={s} className="flex-1 h-1.5 relative group">
                        <div className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-indigo-500' : 'bg-white/10'} ${isCurrent ? 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' : ''}`} />
                        <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <span className="text-[8px] font-black uppercase tracking-tighter bg-gray-900 border border-white/10 px-1.5 py-0.5 rounded text-white">{s}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* MULTI-CHANNEL QUICK ACTIONS */}
                <div className="mt-6 flex flex-wrap gap-2">
                   <button onClick={() => { setNewTaskTitle('📞 Call Log - ' + new Date().toLocaleTimeString()); }} className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-amber-500/20 transition-all">
                     <Phone className="h-3 w-3 mr-2" /> Log Call
                   </button>
                   <button onClick={() => { setNewTaskTitle('📅 Meeting Note - ' + new Date().toLocaleDateString()); }} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-indigo-500/20 transition-all">
                     <Calendar className="h-3 w-3 mr-2" /> Schedule Meeting
                   </button>
                   <button onClick={() => { setNewTaskTitle('✉️ Email Follow-up'); }} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-blue-500/20 transition-all">
                     <Mail className="h-3 w-3 mr-2" /> Email Log
                   </button>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              
              {/* Contact Card */}
              <div className="bg-[#111116] border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                 <div className="flex-1 space-y-1">
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center"><Mail className="h-3 w-3 mr-1.5" /> Email</p>
                   <p className="text-[13px] font-bold text-white break-all">{selectedLead.email || '—'}</p>
                 </div>
                 <div className="hidden sm:block w-px h-8 bg-white/10 mx-2"></div>
                 <div className="block sm:hidden h-px w-full bg-white/5 my-1"></div>
                 <div className="flex-1 space-y-1">
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center"><Phone className="h-3 w-3 mr-1.5" /> Comm Link</p>
                   <div className="flex items-center gap-3">
                     <p className="text-[13px] font-bold text-white">{selectedLead.phone || '—'}</p>
                     {selectedLead.phone && (
                       <div className="flex gap-2">
                         <a href={`tel:${selectedLead.phone}`} className="h-6 w-6 bg-white/5 hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 rounded-md flex items-center justify-center transition-colors"><Phone className="h-3 w-3" /></a>
                         <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="h-6 w-6 bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 rounded-md flex items-center justify-center transition-colors"><MessageCircle className="h-3 w-3" /></a>
                       </div>
                     )}
                   </div>
                 </div>
              </div>

              {/* Extra Metadata */}
              {(selectedLead.business_type || selectedLead.website || selectedLead.external_link || selectedLead.notes) && (
                <div className="bg-[#111116]/50 border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.business_type && (
                      <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Business Type</p>
                        <p className="text-xs font-bold text-gray-300">{selectedLead.business_type}</p>
                      </div>
                    )}
                    {selectedLead.website && (
                      <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Website</p>
                        <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors truncate block">{selectedLead.website}</a>
                      </div>
                    )}
                    {selectedLead.external_link && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Map / External Link</p>
                        <a href={selectedLead.external_link.startsWith('http') ? selectedLead.external_link : `https://${selectedLead.external_link}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors truncate block">{selectedLead.external_link}</a>
                      </div>
                    )}
                    {selectedLead.notes && (
                      <div className="col-span-2 pt-2 border-t border-white/5 mt-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Initial Notes</p>
                        <p className="text-xs font-medium text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedLead.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tasks Quick-Add */}
              <div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-4 flex items-center"><CheckSquare className="h-3.5 w-3.5 mr-2 text-amber-500" /> Account Tasks</h3>
                <form onSubmit={handleCreateTask} className="space-y-3 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {['Call', 'Follow-up', 'Meeting', 'Send Proposal'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewTaskType(type)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                          newTaskType === type
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white/5 text-gray-500 border-white/10 hover:border-indigo-500/40'
                        }`}
                      >{type}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder={`Add ${newTaskType} task...`} className="flex-1 bg-[#111116] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 outline-none placeholder:font-bold" />
                    <button type="submit" disabled={!newTaskTitle.trim()} className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-colors disabled:opacity-30 font-black uppercase text-[10px] tracking-widest">Add</button>
                  </div>
                  <input
                    type="datetime-local"
                    value={newFollowUp}
                    onChange={(e) => setNewFollowUp(e.target.value)}
                    className="w-full bg-[#111116] border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase text-indigo-400 outline-none focus:border-indigo-500"
                    style={{ colorScheme: 'dark' }}
                  />
                </form>
                {/* Local Tasks List */}
                <div className="space-y-2">
                  {tasks.filter(t => t.lead_id === selectedLead.id).map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-[#111116]/50 rounded-lg p-3 border border-white/5">
                       <span className={`text-xs font-bold ${t.status==='Completed' ? 'line-through text-gray-600' : 'text-gray-300'}`}>{t.title}</span>
                       {t.status !== 'Completed' && (
                         <button onClick={() => handleCompleteTask(t.id)} className="text-[9px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-1 rounded">Done</button>
                       )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/5 w-full my-6"></div>

              {/* Activity Feed */}
              <div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-4 flex items-center"><Clock className="h-3.5 w-3.5 mr-2 text-indigo-400" /> Interaction Log</h3>
                <form onSubmit={handleAddNote} className="mb-6 relative">
                  <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Chronicle a meeting, call, or intel..." className="w-full bg-[#111116] border border-white/5 rounded-2xl p-4 pr-12 text-sm text-white focus:border-indigo-500/50 outline-none resize-none h-24 placeholder:font-bold" />
                  <button type="submit" disabled={!newNote.trim()} className="absolute bottom-3 right-3 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-20"><Send className="h-4 w-4" /></button>
                </form>

                <div className="space-y-4">
                   {fetchingActivities ? (
                    <div className="animate-pulse text-[10px] text-gray-600 font-black uppercase tracking-widest py-4">Synchronizing Logs...</div>
                  ) : activities.length > 0 ? (
                    activities.map(activity => (
                      <div key={activity.id} className="relative pl-6 pb-2 border-l-2 border-white/5 last:border-transparent">
                        <div className={`absolute -left-[5px] top-0 h-2 w-2 rounded-full ${activity.activity_type === 'stage_change' ? 'bg-amber-500' : activity.activity_type === 'system' ? 'bg-indigo-500' : 'bg-gray-500'}`}></div>
                        <div className="flex gap-2 items-baseline mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${activity.activity_type === 'stage_change' ? 'text-amber-500' : activity.activity_type === 'system' ? 'text-indigo-400' : 'text-gray-500'}`}>
                            {activity.activity_type === 'stage_change' ? 'Stage Change' : activity.activity_type === 'system' ? 'Auto-Task' : 'Note'}
                          </span>
                          <span className="text-[9px] text-gray-600 font-bold">{new Date(activity.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-300">{activity.description}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">No activity logged yet</p>
                  )}
                </div>
              </div>

            </div>{/* end profile body */}

            {/* PROJECT MODE: shown as extra panel for Won/Onboarding leads */}
            {['Onboarding', 'Won (Converted)', 'Completed'].includes(selectedLead.status) && (
              <div className="border-t border-white/5 bg-[#0c0c0e] p-8 space-y-6 overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                  <Briefcase className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Project Mode Active</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Live onboarding flow</p>
                  </div>
                  <span className={`ml-auto text-[9px] font-black uppercase px-2 py-1 rounded-md ${selectedLead.payment_status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-black'}`}>
                    {selectedLead.payment_status || 'Pending'}
                  </span>
                </div>

                {/* Post-Sale Intake Checklist */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Post-Sale Intake</p>
                  {[
                    { id: 'info', label: 'Client Business Info' },
                    { id: 'assets', label: 'Logo, Content & Branding' },
                    { id: 'reqs', label: 'Detailed Requirements' }
                  ].map(item => {
                    const checked = selectedLead.onboarding_checklist?.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={async () => {
                          const current: string[] = selectedLead.onboarding_checklist || [];
                          const updated = checked ? current.filter((x: string) => x !== item.id) : [...current, item.id];
                          await supabase.from('crm_leads').update({ onboarding_checklist: updated }).eq('id', selectedLead.id);
                          setLeads(leads.map((l: any) => l.id === selectedLead.id ? { ...l, onboarding_checklist: updated } : l));
                          setSelectedLead((prev: any) => ({ ...prev, onboarding_checklist: updated }));
                        }}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:border-white/20 transition-all"
                      >
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/10 hover:border-indigo-500'}`}>
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={`text-xs font-bold ${checked ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Project Milestones */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Project Milestones</p>
                  {['Design', 'Development', 'Testing', 'Delivery'].map((m) => {
                    const ms = selectedLead.project_milestones_status?.[m] || 'Pending';
                    return (
                      <div
                        key={m}
                        onClick={() => {
                          const next = ms === 'Pending' ? 'In Progress' : ms === 'In Progress' ? 'Completed' : 'Pending';
                          updateMilestone(selectedLead.id, m, next);
                        }}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:border-white/20 transition-all group"
                      >
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${ms === 'Completed' ? 'bg-emerald-500 border-emerald-500' : ms === 'In Progress' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'}`}>
                          {ms === 'Completed' ? <Check className="h-3 w-3 text-white" /> : ms === 'In Progress' ? <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> : null}
                        </div>
                        <span className="text-xs font-bold text-gray-300 flex-1">{m}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${ms === 'Completed' ? 'text-emerald-400' : ms === 'In Progress' ? 'text-indigo-400' : 'text-gray-600'}`}>{ms}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Toggle */}
                <button
                  onClick={async () => {
                    const next = selectedLead.payment_status === 'Paid' ? 'Pending' : 'Paid';
                    await supabase.from('crm_leads').update({ payment_status: next }).eq('id', selectedLead.id);
                    setLeads(leads.map((l: any) => l.id === selectedLead.id ? { ...l, payment_status: next } : l));
                    setSelectedLead((prev: any) => ({ ...prev, payment_status: next }));
                    toast.success(`Payment marked as ${next}`);
                  }}
                  className="w-full py-3 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                >
                  {selectedLead.payment_status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Fully Paid'}
                </button>
              </div>
            )}
            </div>
          </div>
        )}
    </div>
  );
}

function termLabel(stage: string) {
  if (stage === 'New Leads' || stage === 'New') return 'New Leads';
  if (stage === 'Won (Converted)' || stage === 'Won') return 'Closed Deal';
  if (stage === 'Lost') return 'Dropped';
  if (stage === 'Not Interested') return 'Not Interested';
  if (stage === 'Onboarding') return 'Active Project';
  return 'In Progress';
}
