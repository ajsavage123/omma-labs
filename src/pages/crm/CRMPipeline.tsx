import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, ChevronRight, ChevronLeft, Plus, Loader2, X, HelpCircle, Trash2, Edit2, Pin, Clock, Globe, MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

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
    name: "Interested", 
    key: 'Interested', 
    color: 'from-amber-500 to-amber-700',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-500',
    description: "Prospect has responded and shown active interest.",
    aliases: ['interested', 'INTERESTED']
  },
  { 
    name: "Proposal", 
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
    name: "Won", 
    key: 'Won (Converted)', 
    color: 'from-emerald-500 to-emerald-700',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-500',
    description: "Success! Deal closed or payment received.",
    aliases: ['Won', 'WON', 'Converted', 'CONVERTED']
  },
  { 
    name: "Lost", 
    key: 'Lost', 
    color: 'from-rose-500 to-rose-700',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-500',
    description: "Opportunity did not convert.",
    aliases: ['lost', 'LOST', 'Rejected']
  },
];

export default function CRMPipeline() {
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    task_type: 'call',
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
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);
  const [filterSalesperson, setFilterSalesperson] = useState<string>("All");

  // Role check: admin/owner sees all, Business & Marketing sees only their own leads
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
        .channel('crm_leads_changes')
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
              setLeads(currentLeads => currentLeads.map(lead => 
                lead.id === payload.new.id ? { ...lead, ...payload.new } : lead
              ));
            } else {
              throttledFetch();
            }
          }
        )
        .subscribe((status, err) => {
          console.log("CRMPipeline Realtime status:", status, err);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*, assigned_user:assigned_to(full_name, username), crm_tasks(id, title, due_date, due_time, status, priority)')
      .eq('workspace_id', user?.workspace_id);
    
    if (error) {
      console.error("Supabase Error:", error);
      toast.error("Error fetching leads");
    }
    
    const sortedData = (data || []).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setLeads(sortedData);
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

  const togglePin = async (leadId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ is_pinned: !currentStatus })
        .eq('id', leadId);
      if (error) throw error;
      toast.success(!currentStatus ? "Pinned to top" : "Unpinned");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to update pin");
      console.error(error);
    }
  };

  const openTaskModal = (lead: any) => {
    const now = new Date();
    const hours24 = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    // Convert to 12h format
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const time12 = `${hours12.toString().padStart(2, '0')}:${minutes}`;

    setTaskFormData({
      title: `Follow up with ${lead.contact_person}`,
      task_type: 'call',
      scheduled_date: now.toISOString().split('T')[0],
      scheduled_time: time12,
      scheduled_ampm: ampm,
      notes: '',
      lead_id: lead.id
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskSubmitting(true);
    try {
      // Convert 12h time to 24h for database
      let [hours, minutes] = taskFormData.scheduled_time.split(':').map(Number);
      if (taskFormData.scheduled_ampm === 'PM' && hours < 12) hours += 12;
      if (taskFormData.scheduled_ampm === 'AM' && hours === 12) hours = 0;
      
      const dueTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('crm_tasks')
        .insert([{
          title: taskFormData.title,
          activity_type: taskFormData.task_type === 'call' ? 'Call' : taskFormData.task_type === 'email' ? 'Email' : taskFormData.task_type === 'meeting' ? 'Meeting' : 'Task',
          lead_id: taskFormData.lead_id,
          due_date: taskFormData.scheduled_date,
          due_time: dueTime,
          workspace_id: user?.workspace_id,
          assigned_to: user?.id,
          priority: 'Medium',
          status: 'Pending'
        }]);

      if (error) throw error;
      
      // Optimistic update of the local lead record
      const newTask = {
        id: Math.random().toString(36).substring(2, 9),
        title: taskFormData.title,
        due_date: taskFormData.scheduled_date,
        due_time: dueTime,
        status: 'Pending',
        priority: 'Medium'
      };

      setLeads(currentLeads => currentLeads.map(l => 
        l.id === taskFormData.lead_id 
          ? { ...l, crm_tasks: [...(l.crm_tasks || []), newTask] }
          : l
      ));

      toast.success(`Task scheduled successfully!`);
      setIsTaskModalOpen(false);
      fetchLeads(); // Refresh leads to get actual DB data and IDs
    } catch (error) {
      toast.error("Failed to schedule task");
      console.error(error);
    } finally {
      setTaskSubmitting(false);
    }
  };
  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this scheduled action?")) return;
    try {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success("Action deleted");
      fetchLeads();
    } catch (error) {
      toast.error("Failed to delete action");
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
      // Parse the free numeric string to an actual number for the database
      const numericValue = typeof formData.estimated_value === 'string' 
        ? parseInt(formData.estimated_value.replace(/[^0-9.]/g, '')) || 0 
        : formData.estimated_value;

      const dataToSave = { 
        ...formData, 
        estimated_value: numericValue,
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
            workspace_id: user?.workspace_id,
            source: 'Manual Entry'
          }]);
        if (error) throw error;
        toast.success("Lead added to New Leads");
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
                <option value="All">All Salespersons</option>
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
            className="hidden sm:inline-flex bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} className="mr-2" />
            Add New Lead
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto pb-8 scroll-smooth custom-horizontal-scrollbar overflow-y-auto">
        <div className="flex gap-4 lg:gap-6 h-full min-w-max pb-4">
          {STAGES.map((stage, sIdx) => {
            const rawLeads = sIdx === 0 
              ? [...getLeadsForStage(stage), ...unmappedLeads]
              : getLeadsForStage(stage);
            
            const stageLeads = rawLeads.filter(l => 
              l.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              l.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

            return (
              <div key={stage.name} className={`flex-shrink-0 w-[85vw] sm:w-[380px] flex flex-col min-h-[850px] bg-card/40 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-border shadow-2xl overflow-hidden backdrop-blur-md`}>
                {/* Stage Header */}
                <div className="p-6 flex-shrink-0 relative bg-background/50 border-b-2 border-border backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-black ${stage.textColor} text-base tracking-tight truncate max-w-[200px] uppercase`}>{stage.name}</h3>
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
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className={`bg-card/80 border-border border-2 p-4 sm:p-8 hover:shadow-2xl transition-all relative group border-t-4 border-t-transparent hover:border-t-primary rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-md min-h-[280px] sm:min-h-[300px] flex flex-col justify-between`}>
                      {/* Stage Navigation Arrows (Hidden on touch, shown on hover/group) */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 lg:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'backward')}
                          disabled={sIdx === 0}
                          className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === 0 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button 
                          onClick={() => updateLeadStage(lead.id, lead.status, 'forward')}
                          disabled={sIdx === STAGES.length - 1}
                          className={`p-2 bg-background/95 backdrop-blur-md rounded-full border-2 border-border shadow-2xl pointer-events-auto transition-all active:scale-75 ${sIdx === STAGES.length - 1 ? 'opacity-0 cursor-default' : 'hover:text-primary text-foreground'}`}
                        >
                          <ChevronRight size={24} />
                        </button>
                      </div>

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-2">
                          <h4 className="font-black text-foreground text-lg tracking-tight leading-tight mb-1">{lead.contact_person}</h4>
                          <p className="text-xs text-primary font-black tracking-widest uppercase">{lead.company_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => togglePin(lead.id, !!lead.is_pinned)}
                            className={`p-2.5 rounded-2xl transition-all border ${lead.is_pinned ? 'bg-primary/10 border-primary text-primary opacity-100' : 'hover:bg-background border-transparent hover:border-primary/20 opacity-0 group-hover:opacity-100'} transition-opacity`}
                            title={lead.is_pinned ? "Unpin" : "Pin to top"}
                          >
                            {lead.is_pinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
                          </button>
                          <button 
                            onClick={() => openEditModal(lead)}
                            className="p-2.5 hover:bg-background rounded-2xl transition-colors text-primary border border-transparent hover:border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit Lead"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteLead(lead.id)}
                            className="p-2.5 hover:bg-red-500/10 rounded-2xl transition-colors text-red-400 border border-transparent hover:border-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Lead"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* New Data Badges: Service & Interest */}
                      <div className="flex flex-wrap gap-2 mb-1">
                         {lead.service_interest && (
                           <div className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">
                             {lead.service_interest}
                           </div>
                         )}
                         {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" 
                               className="p-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-500/20 active:scale-90 group/link"
                               title="Visit Website">
                               <Globe size={14} className="group-hover/link:rotate-12 transition-transform" />
                            </a>
                         )}
                         {lead.external_link && (
                            <a href={lead.external_link} target="_blank" rel="noopener noreferrer" 
                               className="p-2 bg-rose-600/10 border border-rose-500/30 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-500/20 active:scale-90 group/link"
                               title="Google Maps">
                               <MapPin size={14} className="group-hover/link:bounce transition-transform" />
                            </a>
                         )}
                      </div>

                      {/* Contact Actions - LARGER BUTTONS */}
                      <div className="flex flex-wrap gap-2.5 my-4 py-4 border-t border-b border-border/40">
                        <button className="flex-1 min-w-[70px] py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-90" title="Call">
                          <Phone size={16} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Call</span>
                        </button>
                        <button className="flex-1 min-w-[70px] py-2.5 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20 active:scale-90" title="WhatsApp">
                          <MessageCircle size={16} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">WA</span>
                        </button>
                        <button className="flex-1 min-w-[70px] py-2.5 bg-[#EA4335] hover:bg-[#d93025] text-white rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-90" title="Email">
                          <Mail size={16} />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Mail</span>
                        </button>
                      </div>

                      {/* Lead Info - MORE PROMINENT */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex flex-col">
                           <div className={`text-lg font-black ${stage.textColor} tracking-tighter bg-primary/5 px-3 py-1 rounded-xl border border-primary/10 mb-1`}>₹{(lead.estimated_value || 0).toLocaleString()}</div>
                           {lead.assigned_user && (
                             <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></div>
                                Owner: {lead.assigned_user.full_name || lead.assigned_user.username}
                             </div>
                           )}
                        </div>
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-xs font-black text-white border-2 border-card shadow-xl`}>
                          {(lead.contact_person || lead.company_name || 'U')[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Next Action Display */}
                      {lead.crm_tasks && lead.crm_tasks.some((t: any) => t.status === 'Pending') && (
                        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in fade-in slide-in-from-bottom-1 duration-500">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Upcoming Action</p>
                          {lead.crm_tasks
                            .filter((t: any) => t.status === 'Pending')
                            .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                            .slice(0, 1)
                            .map((task: any) => (
                              <div key={task.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Clock size={12} className="text-amber-500 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-foreground truncate">{task.title}</p>
                                    <p className="text-[9px] text-muted-foreground font-medium">
                                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                  title="Delete Action"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Create Task Button - LARGER */}
                      <button 
                        onClick={() => openTaskModal(lead)}
                        className={`w-full mt-4 px-4 py-3.5 bg-gradient-to-r ${stage.color} hover:brightness-110 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2`}
                      >
                        <Plus size={16} />
                        {lead.crm_tasks && lead.crm_tasks.some((t: any) => t.status === 'Pending') ? 'Update Next Action' : 'Schedule Next Action'}
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
          <div className="bg-card border-t sm:border border-border rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-500 max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/30">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{isEditMode ? 'Update Details' : 'Add to Pipeline'}</p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Value (₹)</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black text-base">₹</div>
                    <input 
                      type="text" 
                      value={formData.estimated_value}
                      onChange={(e) => {
                        let val = e.target.value;
                        // Remove leading zeros if they are followed by other numbers
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
                    placeholder="https://company.com"
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
                  className="w-full px-5 py-3.5 bg-background border border-input rounded-2xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium appearance-none"
                >
                  <option value="">Select a salesperson...</option>
                  {workspaceUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} {u.id === user?.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
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
                      <option value="call">📞 Call</option>
                      <option value="email">📧 Email</option>
                      <option value="meeting">🤝 Meeting</option>
                      <option value="quotation">📄 Send Quotation</option>
                    </select>
                  </div>
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
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
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
