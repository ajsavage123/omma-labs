import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCRMData } from "@/contexts/CRMDataContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Trash2, Phone, Clipboard, Search, Plus, X, Loader2, 
  Smile, Calendar, Users, Inbox, ArrowRight, User as UserIcon,
  Building2, Clock, Check, Edit3
} from "lucide-react";

interface ParsedNote {
  type: string;
  icon: string;
  discussionPoints: string;
  sentiment: string;
  nextSteps: string;
  additionalDetails: string;
  isStructured: boolean;
}

export default function CRMNotes() {
  const { activities: notes, leads, allLeads, loading, refreshActivities, refreshLeads, teamMembers, selectedSalesRepId, crmViewMode } = useCRMData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'leads'>('recent');
  const [onlyLeadsWithNotes, setOnlyLeadsWithNotes] = useState(false);

  // Business Comment Quick Edit State
  const [isBusinessCommentModalOpen, setIsBusinessCommentModalOpen] = useState(false);
  const [editingBusinessComment, setEditingBusinessComment] = useState("");
  const [savingBusinessComment, setSavingBusinessComment] = useState(false);
  
  // Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    lead_id: "",
    interaction_type: 'call',
    discussion_points: '',
    sentiment: 'Interested',
    next_steps: '',
    additional_notes: ''
  });

  const parseNote = (desc: string, actType?: string): ParsedNote => {
    const result: ParsedNote = {
      type: 'Note',
      icon: '📝',
      discussionPoints: '',
      sentiment: 'Neutral',
      nextSteps: '',
      additionalDetails: '',
      isStructured: false
    };

    if (!desc && !actType) return result;

    const normalizedType = (actType || '').toLowerCase();
    const normalizedDesc = (desc || '').toLowerCase();

    if (normalizedType === 'call' || normalizedDesc.includes('📞') || normalizedDesc.includes('call')) {
      result.type = 'Call';
      result.icon = '📞';
    } else if (normalizedType === 'email' || normalizedDesc.includes('📧') || normalizedDesc.includes('email')) {
      result.type = 'Email';
      result.icon = '📧';
    } else if (normalizedType === 'meeting' || normalizedDesc.includes('🤝') || normalizedDesc.includes('meeting')) {
      result.type = 'Meeting';
      result.icon = '🤝';
    } else if (normalizedType === 'whatsapp' || normalizedDesc.includes('💬') || normalizedDesc.includes('whatsapp')) {
      result.type = 'WhatsApp';
      result.icon = '💬';
    }

    if (!desc) return result;

    const lines = desc.split('\n');
    let foundStructured = false;

    lines.forEach(line => {
      const cleanLine = line.trim().replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
      
      if (cleanLine.toLowerCase().startsWith('discussion points:')) {
        result.discussionPoints = cleanLine.substring(18).trim();
        foundStructured = true;
      } else if (cleanLine.toLowerCase().startsWith('client sentiment:')) {
        result.sentiment = cleanLine.substring(17).trim();
        foundStructured = true;
      } else if (cleanLine.toLowerCase().startsWith('agreed next steps:')) {
        result.nextSteps = cleanLine.substring(18).trim();
        foundStructured = true;
      } else if (cleanLine.toLowerCase().startsWith('additional details:')) {
        result.additionalDetails = cleanLine.substring(19).trim();
        foundStructured = true;
      }
    });

    if (foundStructured) {
      result.isStructured = true;
    } else {
      result.discussionPoints = desc;
    }

    return result;
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getSentimentStyle = (sentiment: string) => {
    const s = sentiment.toLowerCase();
    if (s.includes('very interested') || s.includes('very_interested') || s.includes('🟢')) {
      return 'bg-emerald-600 text-white border border-emerald-500 shadow-xs font-black';
    }
    if (s.includes('not interested') || s.includes('not_interested') || s.includes('🔴')) {
      return 'bg-rose-600 text-white border border-rose-500 shadow-xs font-black';
    }
    if (s.includes('hesitant') || s.includes('🟠')) {
      return 'bg-orange-600 text-white border border-orange-500 shadow-xs font-black';
    }
    if (s.includes('interested') || s.includes('yellow') || s.includes('🟡')) {
      return 'bg-amber-500 text-slate-950 border border-amber-400 shadow-xs font-black';
    }
    return 'bg-slate-700 text-slate-100 border border-slate-600 shadow-xs font-black';
  };

  const getInteractionIconClass = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'call') return 'bg-blue-600 text-white border-2 border-blue-400 shadow-md';
    if (t === 'email') return 'bg-indigo-600 text-white border-2 border-indigo-400 shadow-md';
    if (t === 'meeting') return 'bg-purple-600 text-white border-2 border-purple-400 shadow-md';
    if (t === 'whatsapp') return 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-md';
    return 'bg-amber-600 text-white border-2 border-amber-400 shadow-md';
  };

  const getInteractionCardAccent = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'call') return 'border-l-4 border-l-blue-500 bg-slate-900 border-slate-800';
    if (t === 'email') return 'border-l-4 border-l-indigo-500 bg-slate-900 border-slate-800';
    if (t === 'meeting') return 'border-l-4 border-l-purple-500 bg-slate-900 border-slate-800';
    if (t === 'whatsapp') return 'border-l-4 border-l-emerald-500 bg-slate-900 border-slate-800';
    return 'border-l-4 border-l-amber-500 bg-slate-900 border-slate-800';
  };

  const openLogModal = (leadId: string | null) => {
    const defaultLead = leads.find(l => l.id === leadId) || leads[0];
    setNoteFormData({
      lead_id: defaultLead?.id || "",
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
    if (!user || !noteFormData.lead_id) return;
    
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

      const { error } = await supabase.from('crm_activities').insert([{
        lead_id: noteFormData.lead_id,
        user_id: user.id,
        activity_type: 'note',
        description: formattedNote,
        workspace_id: user.workspace_id
      }]);

      if (error) throw error;

      // Update lead's concatenated notes
      const targetLead = leads.find(l => l.id === noteFormData.lead_id);
      if (targetLead) {
        const updatedNotes = targetLead.notes 
          ? `${formattedNote}\n\n---\n\n${targetLead.notes}`
          : formattedNote;

        const { error: leadErr } = await supabase
          .from('crm_leads')
          .update({ notes: updatedNotes })
          .eq('id', noteFormData.lead_id);

        if (leadErr) throw leadErr;
      }

      toast.success("Interaction logged successfully!");
      setIsNoteModalOpen(false);
      refreshActivities();
      refreshLeads();
    } catch (error) {
      toast.error("Failed to log interaction");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string, leadId: string, description: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error: actErr } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', noteId);

      if (actErr) throw actErr;

      const { data: leadData, error: leadFetchErr } = await supabase
        .from('crm_leads')
        .select('notes')
        .eq('id', leadId)
        .single();

      if (!leadFetchErr && leadData?.notes) {
        const parts = leadData.notes.split('\n\n---\n\n');
        const updatedParts = parts.filter((part: string) => part.trim() !== description.trim());
        const updatedNotes = updatedParts.join('\n\n---\n\n') || null;

        await supabase
          .from('crm_leads')
          .update({ notes: updatedNotes })
          .eq('id', leadId);
      }

      toast.success("Note deleted successfully");
      refreshActivities();
      refreshLeads();
    } catch (err) {
      toast.error("Failed to delete note");
      console.error(err);
    }
  };

  // Source leads: include leads assigned to current filter AND any leads that have notes in the current view
  const displayLeadsPool = useMemo(() => {
    const pool = (allLeads && allLeads.length > 0) ? allLeads : leads;
    if (selectedSalesRepId === 'all' || selectedSalesRepId === 'mine' || crmViewMode === 'mine') {
      return pool;
    }
    // For a specific rep, include their assigned leads plus any leads they logged notes on
    return pool.filter(l => l.assigned_to === selectedSalesRepId || notes.some(n => n.lead_id === l.id));
  }, [allLeads, leads, selectedSalesRepId, crmViewMode, notes]);

  // Ensure newly created notes appear at the very first (descending sort by created_at)
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [notes]);

  // Map each lead to their latest note timestamp
  const leadLatestNoteTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      if (n.lead_id) {
        const t = new Date(n.created_at || 0).getTime();
        const current = map.get(n.lead_id) || 0;
        if (t > current) map.set(n.lead_id, t);
      }
    }
    return map;
  }, [notes]);

  // Get list of all leads sorted with recent active leads first
  const uniqueLeads = useMemo(() => {
    return displayLeadsPool
      .map(lead => ({
        id: lead.id,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        noteCount: notes.filter(x => x.lead_id === lead.id).length,
        latestNoteTime: leadLatestNoteTime.get(lead.id) || 0,
        comment_on_business: lead.comment_on_business || lead.custom_data?.comment_on_business || ''
      }))
      .filter(lead => {
        if (onlyLeadsWithNotes && lead.noteCount === 0) return false;
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
          lead.company_name.toLowerCase().includes(q) ||
          (lead.contact_person && lead.contact_person.toLowerCase().includes(q)) ||
          lead.comment_on_business.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Leads with newer notes first
        if (b.latestNoteTime !== a.latestNoteTime) {
          return b.latestNoteTime - a.latestNoteTime;
        }
        // Then by note count
        if (b.noteCount !== a.noteCount) {
          return b.noteCount - a.noteCount;
        }
        return a.company_name.localeCompare(b.company_name);
      });
  }, [displayLeadsPool, notes, leadLatestNoteTime, onlyLeadsWithNotes, searchQuery]);

  // Filter notes based on selection, search, type (newest first)
  const filteredNotes = useMemo(() => {
    return sortedNotes.filter(note => {
      if (selectedLeadId && note.lead_id !== selectedLeadId) return false;
      
      const parsed = parseNote(note.description, note.activity_type);
      
      // Type Filter
      if (activeFilter !== 'all') {
        const typeMatches = (activeFilter === 'call' && (parsed.type === 'Call' || note.activity_type === 'call')) ||
                            (activeFilter === 'email' && (parsed.type === 'Email' || note.activity_type === 'email')) ||
                            (activeFilter === 'meeting' && (parsed.type === 'Meeting' || note.activity_type === 'meeting')) ||
                            (activeFilter === 'whatsapp' && (parsed.type === 'WhatsApp' || note.activity_type === 'whatsapp'));
        if (!typeMatches) return false;
      }
      
      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCompany = note.crm_leads?.company_name?.toLowerCase().includes(q);
        const matchContact = note.crm_leads?.contact_person?.toLowerCase().includes(q);
        const matchContent = note.description?.toLowerCase().includes(q);
        const matchAuthor = (note.user?.full_name || note.user?.username || '').toLowerCase().includes(q);
        const matchSentiment = parsed.sentiment.toLowerCase().includes(q);
        return Boolean(matchCompany || matchContact || matchContent || matchAuthor || matchSentiment);
      }

      return true;
    });
  }, [sortedNotes, selectedLeadId, activeFilter, searchQuery]);

  const selectedLead = (allLeads && allLeads.length > 0 ? allLeads : leads).find(l => l.id === selectedLeadId);
  const selectedLeadBusinessComment = useMemo(() => {
    if (!selectedLead) return '';
    return selectedLead.comment_on_business || selectedLead.custom_data?.comment_on_business || '';
  }, [selectedLead]);

  const handleSaveBusinessComment = async () => {
    if (!selectedLead) return;
    setSavingBusinessComment(true);
    try {
      const existingCustom = selectedLead.custom_data || {};
      const updatedCustom = {
        ...existingCustom,
        comment_on_business: editingBusinessComment.trim() || null
      };

      const { error } = await supabase
        .from('crm_leads')
        .update({
          custom_data: updatedCustom
        })
        .eq('id', selectedLead.id);

      if (error) throw error;
      toast.success("Business comment saved!");
      setIsBusinessCommentModalOpen(false);
      refreshLeads();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save comment on business");
    } finally {
      setSavingBusinessComment(false);
    }
  };

  // Dashboard Stats
  const totalNotesCount = notes.length;
  const callsCount = notes.filter(n => (n.description || '').toLowerCase().includes('📞') || (n.description || '').toLowerCase().includes('call') || n.activity_type === 'call').length;
  const meetingsCount = notes.filter(n => (n.description || '').toLowerCase().includes('🤝') || (n.description || '').toLowerCase().includes('meeting') || n.activity_type === 'meeting').length;
  const positiveSentimentCount = notes.filter(n => {
    const parsed = parseNote(n.description);
    const sentiment = parsed.sentiment.toLowerCase();
    return sentiment.includes('very interested') || (sentiment.includes('interested') && !sentiment.includes('not'));
  }).length;
  const positiveRate = totalNotesCount > 0 ? Math.round((positiveSentimentCount / totalNotesCount) * 100) : 0;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Loading interaction logs...</p>
      </div>
    );
  }

  const activeRep = (teamMembers || []).find(m => m.id === selectedSalesRepId);
  const filterLabel = crmViewMode === 'mine' ? 'My Notes' : 
    selectedSalesRepId === 'all' ? 'All Team Notes' : 
    activeRep ? `${activeRep.full_name || activeRep.username}` : 'Team Notes';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Interaction Hub</h1>
            <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black rounded-full uppercase tracking-wider">
              {filterLabel}
            </span>
          </div>
          <p className="text-muted-foreground">High-fidelity client conversation logs and history timeline ({notes.length} total logs).</p>
        </div>
        <Button 
          onClick={() => openLogModal(selectedLeadId)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-6 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Log Interaction
        </Button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-blue-600 text-white shadow-sm">
            <Clipboard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Logs</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalNotesCount}</p>
          </div>
        </Card>

        <Card className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-sky-600 text-white shadow-sm">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone Calls</p>
            <p className="text-2xl font-black text-white mt-0.5">{callsCount}</p>
          </div>
        </Card>

        <Card className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-purple-600 text-white shadow-sm">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Meetings</p>
            <p className="text-2xl font-black text-white mt-0.5">{meetingsCount}</p>
          </div>
        </Card>

        <Card className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Smile size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Positive Sentiment</p>
            <p className="text-2xl font-black text-white mt-0.5">{positiveRate}%</p>
          </div>
        </Card>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Organized Notes & Leads navigation (4/12 span) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
            
            {/* Header with View Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm uppercase text-white tracking-wider mb-0.5">Directory & Feeds</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Newest logs shown first</p>
                </div>
                {sidebarTab === 'leads' && (
                  <button
                    onClick={() => setOnlyLeadsWithNotes(!onlyLeadsWithNotes)}
                    className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${
                      onlyLeadsWithNotes
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'text-slate-400 border-slate-700 hover:text-white bg-slate-800'
                    }`}
                    title="Toggle leads with recorded notes only"
                  >
                    {onlyLeadsWithNotes ? "Notes Only" : "All Leads"}
                  </button>
                )}
              </div>

              {/* Sidebar Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSidebarTab('recent')}
                  className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'recent'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Clock size={13} /> Recent Stream
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab('leads')}
                  className={`py-2 px-3 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    sidebarTab === 'leads'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users size={13} /> By Lead
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search leads or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white transition-all font-medium placeholder:text-slate-500"
              />
            </div>

            {/* Global Feed Quick Option */}
            <button 
              onClick={() => setSelectedLeadId(null)}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                selectedLeadId === null 
                  ? 'bg-slate-950 border-2 border-blue-500 shadow-md shadow-blue-500/10' 
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200'
              }`}
            >
              <div>
                <h4 className="font-black text-xs sm:text-sm tracking-tight flex items-center gap-1.5 text-white">
                  🌐 Global Activity Feed
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">All lead interactions timeline</p>
              </div>
              <div className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-black text-slate-300 uppercase">
                {notes.length} logs
              </div>
            </button>

            {/* TAB 1: Recent Notes Stream (Newest First) */}
            {sidebarTab === 'recent' && (
              <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {sortedNotes.map((note) => {
                  const parsed = parseNote(note.description, note.activity_type);
                  const isSelected = selectedLeadId === note.lead_id;
                  const companyName = note.crm_leads?.company_name || 'Unassigned Lead';
                  const contactPerson = note.crm_leads?.contact_person;

                  return (
                    <button
                      key={note.id}
                      onClick={() => setSelectedLeadId(note.lead_id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 group ${
                        isSelected 
                          ? 'bg-slate-950 border-2 border-blue-500 shadow-md shadow-blue-500/10' 
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{parsed.icon}</span>
                          <span className="font-black text-xs text-white truncate group-hover:text-blue-400 transition-colors">
                            {companyName}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                          {formatRelativeTime(note.created_at)}
                        </span>
                      </div>

                      {contactPerson && (
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                          {contactPerson}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed font-medium bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        {parsed.discussionPoints || '—'}
                      </p>

                      <div className="flex items-center justify-between text-[9px] pt-0.5">
                        <span className={`px-2 py-0.5 rounded font-black uppercase tracking-wider text-white ${getInteractionIconClass(parsed.type)}`}>
                          {parsed.type}
                        </span>
                        {parsed.sentiment && (
                          <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${getSentimentStyle(parsed.sentiment)}`}>
                            {parsed.sentiment.replace(/[🟢🔴🟡⚪🟠]/gu, '').trim()}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {sortedNotes.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                    <Inbox className="mx-auto text-slate-500 mb-2" size={24} />
                    <p className="text-xs text-slate-400 font-semibold">No recent logs found.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Unique Leads Directory (Sorted by recent note activity) */}
            {sidebarTab === 'leads' && (
              <div className="space-y-2 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {uniqueLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                      selectedLeadId === lead.id 
                        ? 'bg-slate-950 border-2 border-blue-500 text-white shadow-md shadow-blue-500/10' 
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs sm:text-sm tracking-tight truncate group-hover:text-blue-400 transition-colors text-white">
                          {lead.company_name}
                        </h4>
                        {lead.comment_on_business && (
                          <span title="Has Business Comment" className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 border border-amber-400 text-[9px] font-black tracking-wider flex items-center gap-1 shrink-0">
                            <Building2 size={10} />
                            Comment
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate mt-0.5">
                        {lead.contact_person || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors ${
                        selectedLeadId === lead.id ? 'bg-blue-600 text-white border border-blue-500' : 'bg-slate-900 border border-slate-800 text-blue-400'
                      }`}>
                        {lead.noteCount} {lead.noteCount === 1 ? 'log' : 'logs'}
                      </div>
                      {lead.latestNoteTime > 0 && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          {formatRelativeTime(new Date(lead.latestNoteTime).toISOString())}
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {uniqueLeads.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/50">
                    <Inbox className="mx-auto text-slate-500 mb-2" size={24} />
                    <p className="text-xs text-slate-400 font-semibold">No leads found matching your criteria.</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Timeline Thread (8/12 span) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl min-h-[580px] flex flex-col">
            
            {/* Thread Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white px-3 py-1 rounded-full bg-blue-600 border border-blue-500 shadow-xs">
                  {selectedLeadId ? "Lead History" : "Unified Stream"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2 tracking-tight">
                  {selectedLeadId ? selectedLead?.company_name : "Global Activity Timeline"}
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {selectedLeadId ? `Primary Contact: ${selectedLead?.contact_person || '—'}` : "Showing all logged interactions across accounts (newest first)"}
                </p>
              </div>

              {/* Action Filter Pills */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-xl self-start md:self-auto overflow-x-auto max-w-full shadow-inner">
                {['all', 'call', 'meeting', 'whatsapp', 'email'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-lg transition-all ${
                      activeFilter === f
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Lead's "Comment on the Business" Key Points Card */}
            {selectedLead && (
              <div className="bg-slate-950 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 mb-6 shadow-md">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        Comment on the Business
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">Key Points</span>
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Core operational notes, business model, &amp; company insights
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingBusinessComment(selectedLeadBusinessComment);
                      setIsBusinessCommentModalOpen(true);
                    }}
                    className="h-9 px-4 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit3 size={14} />
                    {selectedLeadBusinessComment ? "Edit Key Points" : "+ Add Comment"}
                  </Button>
                </div>
                {selectedLeadBusinessComment ? (
                  <div className="mt-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white leading-relaxed whitespace-pre-wrap font-semibold">
                    {selectedLeadBusinessComment}
                  </div>
                ) : (
                  <div className="mt-2 p-3.5 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 text-xs text-slate-400 italic">
                    No business comments or company insights recorded yet. Click &quot;+ Add Comment&quot; to note key business points for this account.
                  </div>
                )}
              </div>
            )}

            {/* Thread Content */}
            <div className="flex-1 relative">
              {filteredNotes.length > 0 && (
                <div className="absolute left-[21px] top-6 bottom-6 w-[2px] bg-slate-800 z-0 hidden sm:block" />
              )}

              <div className="space-y-6 z-10 relative">
                {filteredNotes.map((note) => {
                  const parsed = parseNote(note.description, note.activity_type);
                  const sentiment = getSentimentStyle(parsed.sentiment);
                  
                  return (
                    <div key={note.id} className="flex gap-4 items-start group/card">
                      {/* Timeline Dot (solid interactive type badge) */}
                      <div className={`hidden sm:flex h-11 w-11 shrink-0 rounded-2xl items-center justify-center font-bold shadow-md relative z-10 transition-transform group-hover/card:scale-105 ${getInteractionIconClass(parsed.type)}`}>
                        <span className="text-base">{parsed.icon}</span>
                      </div>

                      {/* Content Card with Solid Color Look */}
                      <div className={`flex-1 rounded-2xl p-5 sm:p-6 transition-all shadow-md hover:shadow-lg border ${getInteractionCardAccent(parsed.type)}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="sm:hidden text-base">{parsed.icon}</span>
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs ${getInteractionIconClass(parsed.type)}`}>
                              <span>{parsed.icon}</span>
                              <span>{parsed.type} Interaction</span>
                            </div>
                            {!selectedLeadId && note.crm_leads && (
                              <button
                                onClick={() => setSelectedLeadId(note.lead_id)}
                                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                              >
                                @ {note.crm_leads.company_name}
                              </button>
                            )}
                            {parsed.sentiment && (
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${sentiment}`}>
                                {parsed.sentiment.replace(/[🟢🔴🟡⚪🟠]/gu, '').trim()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
                            {(note.user || note.user_id) && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 shadow-xs" title={`Logged by ${note.user?.full_name || note.user?.username || 'Team Member'}`}>
                                <UserIcon size={12} className="text-blue-400 shrink-0" />
                                <span className="text-slate-400 font-semibold uppercase text-[10px]">By</span>
                                <span className="text-white font-bold truncate max-w-[120px]">
                                  {note.user?.full_name || note.user?.username || (note.user_id === user?.id ? 'You' : 'Team Member')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-bold uppercase bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-xs">
                              <Clock size={12} className="text-blue-400" />
                              {formatRelativeTime(note.created_at)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold uppercase bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-xs">
                              <Calendar size={12} className="text-blue-400" />
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id, note.lead_id, note.description)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover/card:opacity-100 transition-all ml-1"
                              title="Delete Note"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Note Fields rendering */}
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Discussion &amp; Outcomes</p>
                            <div className="leading-relaxed whitespace-pre-wrap text-white font-medium text-sm bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                              {parsed.discussionPoints || '—'}
                            </div>
                          </div>

                          {parsed.nextSteps && parsed.nextSteps !== '—' && (
                            <div className="border-2 border-indigo-500 bg-indigo-950 p-4 rounded-xl shadow-md">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-xs">
                                  Agreed Next Action
                                </span>
                              </div>
                              <p className="text-sm text-indigo-100 font-bold flex items-center gap-2 mt-1.5">
                                <ArrowRight size={14} className="text-indigo-400 shrink-0" />
                                <span>{parsed.nextSteps}</span>
                              </p>
                            </div>
                          )}

                          {parsed.additionalDetails && parsed.additionalDetails !== '—' && (
                            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Additional details</p>
                              <p className="text-xs text-slate-300 italic whitespace-pre-wrap leading-relaxed">
                                {parsed.additionalDetails}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredNotes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/30 rounded-3xl bg-background/5">
                    <Inbox className="text-muted-foreground/30 mb-3" size={36} />
                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">No logs recorded</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto font-medium">
                      There are no interactions matching this filter or recorded on this account.
                    </p>
                    <Button 
                      onClick={() => openLogModal(selectedLeadId)}
                      className="mt-5 bg-background border border-border hover:bg-muted text-[10px] font-black uppercase tracking-wider py-5 rounded-xl px-4 flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Log First Note
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Business Comment Modal */}
      {isBusinessCommentModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Comment on the Business</h2>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5">{selectedLead.company_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsBusinessCommentModalOpen(false)} 
                className="p-2 hover:bg-background rounded-xl transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={14} />
                  Company Key Points &amp; Insights
                </label>
                <textarea
                  value={editingBusinessComment}
                  onChange={(e) => setEditingBusinessComment(e.target.value)}
                  placeholder="e.g. Enterprise logistics company with 50+ trucks, migrating to custom ERP in Q4, decision maker is cautious about onboarding time."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all font-semibold custom-scrollbar"
                />
                <p className="text-xs text-slate-300 font-medium">
                  Saved directly to the company profile and visible across Leads, Pipeline, and Notes.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <Button 
                  onClick={handleSaveBusinessComment}
                  disabled={savingBusinessComment} 
                  className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {savingBusinessComment ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Comment
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setIsBusinessCommentModalOpen(false)}
                  className="w-full py-5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-black uppercase tracking-wider active:scale-95 transition-all"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Interaction Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Log Client Interaction</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Record phone calls, meetings, messages</p>
              </div>
              <button 
                onClick={() => setIsNoteModalOpen(false)} 
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleNoteSubmit} className="p-5 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                
                {/* Lead selection dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Client / Lead *</label>
                  <select
                    value={noteFormData.lead_id}
                    onChange={(e) => setNoteFormData({...noteFormData, lead_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Select a lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                        {l.company_name} ({l.contact_person})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interaction Type</label>
                    <select 
                      value={noteFormData.interaction_type}
                      onChange={(e) => setNoteFormData({...noteFormData, interaction_type: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="call" className="bg-slate-900 text-white">📞 Phone Call</option>
                      <option value="whatsapp" className="bg-slate-900 text-white">💬 WhatsApp Msg</option>
                      <option value="email" className="bg-slate-900 text-white">📧 Email Sent/Recv</option>
                      <option value="meeting" className="bg-slate-900 text-white">🤝 F2F Meeting</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Sentiment</label>
                    <select 
                      value={noteFormData.sentiment}
                      onChange={(e) => setNoteFormData({...noteFormData, sentiment: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="Very Interested" className="bg-slate-900 text-emerald-400 font-bold">🟢 Very Interested</option>
                      <option value="Interested" className="bg-slate-900 text-amber-400 font-bold">🟡 Interested</option>
                      <option value="Neutral" className="bg-slate-900 text-slate-300 font-bold">⚪ Neutral / Followup</option>
                      <option value="Hesitant" className="bg-slate-900 text-orange-400 font-bold">🟠 Hesitant</option>
                      <option value="Not Interested" className="bg-slate-900 text-rose-400 font-bold">🔴 Not Interested</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Discussion Points *</label>
                  <textarea 
                    value={noteFormData.discussion_points}
                    onChange={(e) => setNoteFormData({...noteFormData, discussion_points: e.target.value})}
                    placeholder="What did they say? What was requested?"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium custom-scrollbar" 
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agreed Next Steps</label>
                  <input 
                    type="text" 
                    value={noteFormData.next_steps}
                    onChange={(e) => setNoteFormData({...noteFormData, next_steps: e.target.value})}
                    placeholder="e.g., Send pricing spreadsheet tomorrow"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes</label>
                  <textarea 
                    value={noteFormData.additional_notes}
                    onChange={(e) => setNoteFormData({...noteFormData, additional_notes: e.target.value})}
                    placeholder="Any personal context, other stakeholders, budget caveats..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium custom-scrollbar" 
                  />
                </div>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full py-6 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Clipboard size={16} className="mr-2" />}
                  Save Note
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="w-full py-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all"
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
