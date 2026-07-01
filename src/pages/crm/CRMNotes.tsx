import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCRMData } from "@/contexts/CRMDataContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Trash2, Phone, Clipboard, Search, Plus, X, Loader2, 
  Smile, Calendar, Users, Inbox, ArrowRight
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
  const { activities: notes, leads, loading, refreshActivities, refreshLeads } = useCRMData();
  const { user } = useAuth();
  const { toast, toasts, removeToast } = useToast();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
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

  const parseNote = (desc: string): ParsedNote => {
    const result: ParsedNote = {
      type: 'Note',
      icon: '📝',
      discussionPoints: '',
      sentiment: 'Neutral',
      nextSteps: '',
      additionalDetails: '',
      isStructured: false
    };

    if (!desc) return result;

    if (desc.includes('📞') || desc.toLowerCase().includes('call')) {
      result.type = 'Call';
      result.icon = '📞';
    } else if (desc.includes('📧') || desc.toLowerCase().includes('email')) {
      result.type = 'Email';
      result.icon = '📧';
    } else if (desc.includes('🤝') || desc.toLowerCase().includes('meeting')) {
      result.type = 'Meeting';
      result.icon = '🤝';
    } else if (desc.includes('💬') || desc.toLowerCase().includes('whatsapp')) {
      result.type = 'WhatsApp';
      result.icon = '💬';
    }

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

  const getSentimentStyle = (sentiment: string) => {
    const s = sentiment.toLowerCase();
    if (s.includes('very interested') || s.includes('very_interested') || s.includes('🟢')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (s.includes('not interested') || s.includes('not_interested') || s.includes('🔴')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (s.includes('hesitant') || s.includes('🟠')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
    if (s.includes('interested') || s.includes('yellow') || s.includes('🟡')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const getInteractionIconClass = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'call') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    if (t === 'email') return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    if (t === 'meeting') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    if (t === 'whatsapp') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  };

  const openLogModal = (leadId: string | null) => {
    setNoteFormData({
      lead_id: leadId || (leads.length > 0 ? leads[0].id : ""),
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
        description: formattedNote
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

  // Get unique list of leads that have notes
  const uniqueLeads = Array.from(
    new Map(
      notes
        .filter(n => n.crm_leads)
        .map(n => [n.lead_id, {
          id: n.lead_id,
          company_name: n.crm_leads.company_name,
          contact_person: n.crm_leads.contact_person,
          noteCount: notes.filter(x => x.lead_id === n.lead_id).length
        }])
    ).values()
  ).filter(lead => 
    lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter notes based on selection, search, type
  const filteredNotes = notes.filter(note => {
    if (selectedLeadId && note.lead_id !== selectedLeadId) return false;
    
    const parsed = parseNote(note.description);
    
    // Type Filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'call' && parsed.type !== 'Call') return false;
      if (activeFilter === 'email' && parsed.type !== 'Email') return false;
      if (activeFilter === 'meeting' && parsed.type !== 'Meeting') return false;
      if (activeFilter === 'whatsapp' && parsed.type !== 'WhatsApp') return false;
    }
    
    // Search Filter (if looking at global feed)
    if (!selectedLeadId && searchQuery) {
      const matchCompany = note.crm_leads?.company_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchContact = note.crm_leads?.contact_person.toLowerCase().includes(searchQuery.toLowerCase());
      const matchContent = note.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCompany || matchContact || matchContent;
    }

    return true;
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  // Dashboard Stats
  const totalNotesCount = notes.length;
  const callsCount = notes.filter(n => n.description.toLowerCase().includes('📞') || n.description.toLowerCase().includes('call')).length;
  const meetingsCount = notes.filter(n => n.description.toLowerCase().includes('🤝') || n.description.toLowerCase().includes('meeting')).length;
  const positiveSentimentCount = notes.filter(n => 
    n.description.toLowerCase().includes('interested') || n.description.toLowerCase().includes('very interested')
  ).length;
  const positiveRate = totalNotesCount > 0 ? Math.round((positiveSentimentCount / totalNotesCount) * 100) : 0;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Loading interaction logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Interaction Hub</h1>
          <p className="text-muted-foreground">High-fidelity client conversation logs and history timeline.</p>
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
        <Card className="bg-card border-border/60 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 rounded-xl bg-primary/10 text-primary border border-primary/15">
            <Clipboard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Logs</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{totalNotesCount}</p>
          </div>
        </Card>

        <Card className="bg-card border-border/60 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Phone Calls</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{callsCount}</p>
          </div>
        </Card>

        <Card className="bg-card border-border/60 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/15">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Meetings</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{meetingsCount}</p>
          </div>
        </Card>

        <Card className="bg-card border-border/60 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
            <Smile size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Positive Sentiment</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{positiveRate}%</p>
          </div>
        </Card>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Leads list (4/12 span) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card/40 backdrop-blur-md border border-border p-5 rounded-3xl space-y-4 shadow-md">
            <div>
              <h3 className="font-black text-sm uppercase text-foreground tracking-wider mb-1">Leads Directory</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Select a lead to isolate their interaction thread.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={16} />
              <input 
                type="text"
                placeholder="Search leads or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border/80 focus:border-border rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-medium placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Unique Leads List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              
              {/* Global Feed Option */}
              <button 
                onClick={() => setSelectedLeadId(null)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selectedLeadId === null 
                    ? 'bg-primary/10 border-primary/20 text-primary-foreground shadow-lg shadow-primary/5' 
                    : 'bg-background/20 border-border/40 hover:bg-muted/40 text-foreground'
                }`}
              >
                <div>
                  <h4 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                    🌐 Global Activity Feed
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">All lead notes timeline</p>
                </div>
                <div className="px-2.5 py-1 bg-background border border-border rounded-xl text-[10px] font-black text-muted-foreground uppercase">
                  {notes.length} logs
                </div>
              </button>

              {/* Individual Lead Options */}
              {uniqueLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                    selectedLeadId === lead.id 
                      ? 'bg-primary/10 border-primary/20 text-primary-foreground shadow-lg shadow-primary/5' 
                      : 'bg-background/20 border-border/40 hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="font-black text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                      {lead.company_name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate mt-0.5">
                      {lead.contact_person || '—'}
                    </p>
                  </div>
                  <div className={`px-2.5 py-1 bg-background border rounded-xl text-[10px] font-black uppercase shrink-0 transition-colors ${
                    selectedLeadId === lead.id ? 'border-primary/20 text-primary' : 'border-border text-muted-foreground'
                  }`}>
                    {lead.noteCount} logs
                  </div>
                </button>
              ))}

              {uniqueLeads.length === 0 && (
                <div className="p-8 text-center border border-dashed border-border/40 rounded-2xl bg-background/5">
                  <Inbox className="mx-auto text-muted-foreground/40 mb-2" size={24} />
                  <p className="text-xs text-muted-foreground font-semibold">No active leads found.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column: Timeline Thread (8/12 span) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-md min-h-[580px] flex flex-col">
            
            {/* Thread Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {selectedLeadId ? "Lead History" : "Unified Stream"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-foreground mt-2 tracking-tight">
                  {selectedLeadId ? selectedLead?.company_name : "Global Activity Timeline"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {selectedLeadId ? `Primary Contact: ${selectedLead?.contact_person || '—'}` : "Showing all logged interactions across all accounts"}
                </p>
              </div>

              {/* Action Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-background border border-border rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
                {['all', 'call', 'meeting', 'whatsapp', 'email'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1.5 text-[9px] uppercase tracking-wider font-black rounded-lg transition-all ${
                      activeFilter === f
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Thread Content */}
            <div className="flex-1 relative">
              {filteredNotes.length > 0 && (
                <div className="absolute left-[21px] top-6 bottom-6 w-[2px] bg-border/60 z-0 hidden sm:block" />
              )}

              <div className="space-y-6 z-10 relative">
                {filteredNotes.map((note) => {
                  const parsed = parseNote(note.description);
                  const sentiment = getSentimentStyle(parsed.sentiment);
                  
                  return (
                    <div key={note.id} className="flex gap-4 items-start group/card">
                      {/* Timeline Dot (glowing interactive type badge) */}
                      <div className={`hidden sm:flex h-11 w-11 shrink-0 rounded-2xl items-center justify-center font-bold shadow-md relative z-10 transition-transform group-hover/card:scale-105 ${getInteractionIconClass(parsed.type)}`}>
                        <span className="text-base">{parsed.icon}</span>
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 bg-background/25 border border-border/80 rounded-2xl p-5 hover:border-border hover:bg-background/45 transition-all shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3 mb-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="sm:hidden text-base">{parsed.icon}</span>
                            <h4 className="font-black text-sm tracking-tight text-foreground uppercase">
                              {parsed.type} Interaction
                            </h4>
                            {!selectedLeadId && note.crm_leads && (
                              <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                @ {note.crm_leads.company_name}
                              </span>
                            )}
                            {parsed.sentiment && (
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-lg ${sentiment}`}>
                                {parsed.sentiment.replace(/[🟢🔴🟡⚪🟠]/g, '').trim()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-semibold uppercase">
                              <Calendar size={12} className="opacity-70" />
                              {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id, note.lead_id, note.description)}
                              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"
                              title="Delete Note"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Note Fields rendering */}
                        <div className="space-y-3.5 text-sm text-foreground">
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Discussion & Outcomes</p>
                            <p className="leading-relaxed whitespace-pre-wrap text-foreground font-medium text-xs bg-muted/20 p-3 rounded-xl border border-border/30">
                              {parsed.discussionPoints || '—'}
                            </p>
                          </div>

                          {parsed.nextSteps && parsed.nextSteps !== '—' && (
                            <div className="border border-indigo-500/10 bg-indigo-500/5 p-3.5 rounded-xl">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Agreed Next Action</p>
                              <p className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                                <ArrowRight size={12} className="text-indigo-400" />
                                {parsed.nextSteps}
                              </p>
                            </div>
                          )}

                          {parsed.additionalDetails && parsed.additionalDetails !== '—' && (
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Additional details</p>
                              <p className="text-xs text-muted-foreground/80 italic whitespace-pre-wrap leading-relaxed pl-1 border-l-2 border-border/80">
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

      {/* Log Interaction Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-card border-2 border-border w-full max-w-lg mx-auto rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="p-5 sm:p-8 border-b border-border flex items-center justify-between bg-background/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Log Client Interaction</h2>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">Record phone calls, meetings, messages</p>
              </div>
              <button 
                onClick={() => setIsNoteModalOpen(false)} 
                className="p-2 hover:bg-background rounded-xl transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleNoteSubmit} className="p-5 sm:p-8 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                
                {/* Lead selection dropdown */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Select Client / Lead *</label>
                  <select
                    value={noteFormData.lead_id}
                    onChange={(e) => setNoteFormData({...noteFormData, lead_id: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-background text-muted-foreground">Select a lead...</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id} className="bg-background text-foreground">
                        {l.company_name} ({l.contact_person})
                      </option>
                    ))}
                  </select>
                </div>

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
                  className="w-full py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Clipboard size={16} className="mr-2" />}
                  Save Note
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="w-full py-6 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
