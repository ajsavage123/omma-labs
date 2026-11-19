import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Loader2, TrendingUp, Clock, AlertCircle, Briefcase, IndianRupee, CheckCircle2,
  Phone, Mail, Calendar as CalendarIcon, MessageSquare, FileText, ChevronDown, ChevronUp, ArrowUpRight
} from "lucide-react";
import { useCRMData } from "@/contexts/CRMDataContext";
import { resolveLeadCompanyName } from "@/utils/crmLeadUtils";
import { classifyTaskBucket } from "@/utils/dateUtils";

export default function CRMDashboard() {
  const navigate = useNavigate();
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'notes' | 'leads'>('all');
  const { leads = [], tasks = [], activities = [], loading, crmViewMode, selectedSalesRepId, teamMembers } = useCRMData();

  // Active salesperson label computation
  const activeRep = (teamMembers || []).find(m => m.id === selectedSalesRepId);
  const filterLabel = crmViewMode === 'mine' ? 'My CRM (Personal)' : 
    selectedSalesRepId === 'all' ? 'All Team Members' : 
    activeRep ? `${activeRep.full_name || activeRep.username}` : 'Team View';

  // Leads and tasks are ALREADY filtered by the global crmViewMode & selectedSalesRepId!
  const displayLeads = leads;
  const displayTasks = tasks;

  const activeLeads = displayLeads.filter(l => !['Lost', 'Not Interested'].includes(l.status));
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const closedWonValue = displayLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status)).reduce((s, l) => s + (l.estimated_value || 0), 0);
  
  const now = new Date();
  
  const tasksDueToday = displayTasks.filter(t => t.status !== 'Completed' && classifyTaskBucket(t, now) === 'today');
  const overdueTasks = displayTasks.filter(t => t.status !== 'Completed' && classifyTaskBucket(t, now) === 'overdue');

  const pipelineData = [
    { name: "New Leads", value: displayLeads.filter(l => l.status === 'New Leads').length, color: "#3B82F6" },
    { name: "Contacted", value: displayLeads.filter(l => l.status === 'Contacted').length, color: "#06B6D4" },
    { name: "Interested", value: displayLeads.filter(l => l.status === 'Interested').length, color: "#F59E0B" },
    { name: "Proposal/Quotation", value: displayLeads.filter(l => l.status === 'Proposal Sent').length, color: "#8B5CF6" },
    { name: "Negotiation", value: displayLeads.filter(l => l.status === 'Negotiation').length, color: "#06B6D4" },
    { name: "Won", value: displayLeads.filter(l => l.status === 'Won (Converted)').length, color: "#10B981" },
  ];

  const stageData = [
    { stage: "New", value: displayLeads.filter(l => l.status === 'New Leads').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Contact", value: displayLeads.filter(l => l.status === 'Contacted').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Interest", value: displayLeads.filter(l => l.status === 'Interested').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Proposal", value: displayLeads.filter(l => l.status === 'Proposal Sent').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Negotiate", value: displayLeads.filter(l => l.status === 'Negotiation').reduce((s,l) => s+(l.estimated_value||0), 0) },
    { stage: "Won", value: displayLeads.filter(l => l.status === 'Won (Converted)').reduce((s,l) => s+(l.estimated_value||0), 0) },
  ];


  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentPipeline = activeLeads.filter(l => new Date(l.created_at) >= thirtyDaysAgo).reduce((s,l) => s + (l.estimated_value || 0), 0);
  const oldPipeline = displayLeads.filter(l => !['Lost', 'Not Interested', 'Won (Converted)', 'Completed'].includes(l.status) && new Date(l.created_at) >= sixtyDaysAgo && new Date(l.created_at) < thirtyDaysAgo).reduce((s,l) => s + (l.estimated_value || 0), 0);
  const pipelineTrend = oldPipeline === 0 ? (recentPipeline > 0 ? '+100%' : '0%') : `${recentPipeline >= oldPipeline ? '+' : ''}${Math.round(((recentPipeline - oldPipeline) / oldPipeline) * 100)}%`;

  const closedWonLeads = displayLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status));
  const recentClosed = closedWonLeads.filter(l => new Date(l.created_at) >= thirtyDaysAgo).reduce((s,l) => s + (l.estimated_value || 0), 0);
  const oldClosed = closedWonLeads.filter(l => new Date(l.created_at) >= sixtyDaysAgo && new Date(l.created_at) < thirtyDaysAgo).reduce((s,l) => s + (l.estimated_value || 0), 0);
  const closedTrend = oldClosed === 0 ? (recentClosed > 0 ? '+100%' : '0%') : `${recentClosed >= oldClosed ? '+' : ''}${Math.round(((recentClosed - oldClosed) / oldClosed) * 100)}%`;

  const stats = [
    { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString()}`, icon: IndianRupee, trend: pipelineTrend, color: "text-blue-500" },
    { label: "Closed Won", value: `₹${closedWonValue.toLocaleString()}`, icon: CheckCircle2, trend: closedTrend, color: "text-green-500" },
    { label: "Due Today", value: tasksDueToday.length, icon: Clock, trend: tasksDueToday.length > 0 ? "Action Req" : "Clear", color: "text-amber-500" },
    { label: "Overdue", value: overdueTasks.length, icon: AlertCircle, trend: overdueTasks.length > 0 ? "Urgent" : "Good", color: "text-red-500" },
  ];

  // Unified chronological activity & updates feed
  const feedItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'activity' | 'lead';
      activityType?: string;
      date: Date;
      icon: any;
      iconBg: string;
      iconColor: string;
      badge?: string;
      badgeColor?: string;
      leadId?: string;
    }> = [];

    // 1. Lead stage movements / newly added leads
    (displayLeads || []).forEach(lead => {
      items.push({
        id: `lead-${lead.id}`,
        title: resolveLeadCompanyName(lead),
        subtitle: `Moved to ${lead.status}`,
        type: 'lead',
        date: new Date(lead.created_at || Date.now()),
        icon: Briefcase,
        iconBg: 'from-primary/20 to-primary/5',
        iconColor: 'text-primary',
        badge: lead.status,
        badgeColor: 'text-primary bg-primary/10 border-primary/20',
        leadId: lead.id,
      });
    });

    // 2. Real CRM interaction activities (calls, meetings, whatsapp, notes)
    (activities || []).forEach(act => {
      const actType = (act.activity_type || '').toLowerCase();
      const desc = act.description || '';
      const isCall = actType === 'call' || desc.includes('📞');
      const isMeeting = actType === 'meeting' || desc.includes('🤝');
      const isWhatsApp = actType === 'whatsapp' || desc.includes('💬');
      const isEmail = actType === 'email' || desc.includes('📧');

      let icon = FileText;
      let iconColor = 'text-amber-400';
      let iconBg = 'from-amber-500/20 to-amber-500/5';
      let label = 'Note';

      if (isCall) {
        icon = Phone;
        iconColor = 'text-blue-400';
        iconBg = 'from-blue-500/20 to-blue-500/5';
        label = 'Call';
      } else if (isMeeting) {
        icon = CalendarIcon;
        iconColor = 'text-purple-400';
        iconBg = 'from-purple-500/20 to-purple-500/5';
        label = 'Meeting';
      } else if (isWhatsApp) {
        icon = MessageSquare;
        iconColor = 'text-emerald-400';
        iconBg = 'from-emerald-500/20 to-emerald-500/5';
        label = 'WhatsApp';
      } else if (isEmail) {
        icon = Mail;
        iconColor = 'text-indigo-400';
        iconBg = 'from-indigo-500/20 to-indigo-500/5';
        label = 'Email';
      }

      const company = act.crm_leads?.company_name || 'CRM Lead';
      const firstLine = desc.split('\n')[0].replace(/^[-•\s*#]+/, '').trim() || `${label} interaction logged`;

      items.push({
        id: `act-${act.id}`,
        title: company,
        subtitle: firstLine,
        type: 'activity',
        activityType: label,
        date: new Date(act.created_at || Date.now()),
        icon,
        iconBg,
        iconColor,
        badge: label,
        badgeColor: `${iconColor} bg-card border-border`,
        leadId: act.lead_id,
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [displayLeads, activities]);

  const filteredFeed = useMemo(() => {
    if (activityFilter === 'notes') return feedItems.filter(i => i.type === 'activity');
    if (activityFilter === 'leads') return feedItems.filter(i => i.type === 'lead');
    return feedItems;
  }, [feedItems, activityFilter]);

  const visibleItems = showAllActivities ? filteredFeed : filteredFeed.slice(0, 8);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight">Sales Dashboard</h1>
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider">
              {filterLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">Overview ({displayLeads.length} leads, {displayTasks.length} tasks)</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3 sm:p-5 lg:p-6 bg-card border-border rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-md sm:shadow-xl hover:shadow-2xl transition-all border-b-4 border-b-primary/10 group">
            <div className="flex items-center justify-between mb-1.5 sm:mb-4">
              <div className={`p-1.5 sm:p-3 bg-background rounded-lg sm:rounded-2xl ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon size={16} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <span className="text-[8px] sm:text-[10px] font-black bg-background text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded-full border border-border">{stat.trend}</span>
            </div>
            <div className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{stat.label}</div>
            <div className="text-base sm:text-2xl lg:text-3xl font-black text-foreground mt-0.5 sm:mt-1 tracking-tighter truncate">{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          <Card className="p-3 sm:p-6 bg-card border-border rounded-xl sm:rounded-3xl shadow-xl">
            <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Pipeline Value by Stage
            </h2>
            <div className="w-full min-h-[250px] sm:min-h-[350px]">
              <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 250 : 350}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="stage" stroke="#64748b" style={{ fontSize: "10px", fontWeight: "bold" }} />
                  <YAxis stroke="#64748b" style={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "1px solid #334155", color: "#f1f5f9" }}
                    itemStyle={{ color: "#7c3aed", fontWeight: "bold" }}
                  />
                  <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Pie Chart */}
            <Card className="p-3 sm:p-6 bg-card border-border rounded-xl sm:rounded-3xl shadow-xl">
              <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">Lead Distribution</h2>
              <div className="w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pipelineData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pipelineData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stage Legend */}
            <Card className="p-3 sm:p-6 bg-card border-border rounded-xl sm:rounded-3xl shadow-xl">
              <h2 className="text-sm font-black text-foreground mb-4 uppercase tracking-widest">Stage Legend</h2>
              <div className="space-y-2.5">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[11px] font-bold text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar Column: Recent Updates & Activities */}
        <div className="space-y-3 sm:space-y-6">
          <Card className="p-3 sm:p-6 bg-card border-border rounded-xl sm:rounded-3xl shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg font-black text-foreground uppercase tracking-widest text-[11px] truncate">
                  Recent Updates
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border shrink-0">
                  {filteredFeed.length}
                </span>
              </div>
              
              {feedItems.length > 0 && (
                <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivityFilter('all')}
                    className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
                      activityFilter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('notes')}
                    className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
                      activityFilter === 'notes' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Notes & Call activities"
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityFilter('leads')}
                    className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
                      activityFilter === 'leads' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Lead updates"
                  >
                    Leads
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Feed Container - Medium container on mobile with smooth touch scrolling */}
            <div 
              className={`space-y-2.5 sm:space-y-3 overflow-y-auto overscroll-contain touch-pan-y transition-all custom-scrollbar pr-1.5 focus:outline-none [webkit-overflow-scrolling:touch] ${
                showAllActivities 
                  ? 'h-[320px] sm:h-[480px]' 
                  : 'h-[250px] sm:h-[380px] lg:h-[460px]'
              }`}
              tabIndex={0}
              role="region"
              aria-label="Recent updates and activities"
            >
              {visibleItems.length === 0 ? (
                <div className="py-8 sm:py-12 text-center text-muted-foreground text-xs">
                  <Clock className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 opacity-40 text-primary" />
                  <p className="font-semibold">No recent updates recorded.</p>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => navigate(item.type === 'activity' ? (item.leadId ? `/crm/notes?leadId=${item.leadId}` : '/crm/notes') : '/crm/leads')}
                    className="flex gap-2.5 sm:gap-3.5 items-start p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-muted/10 hover:bg-muted/30 border border-border/40 hover:border-primary/30 transition-all cursor-pointer group active:scale-[0.99]"
                    title={`Click to view ${item.title}`}
                  >
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center flex-shrink-0 ${item.iconColor} border border-border/60 group-hover:scale-105 transition-transform shadow-xs`}>
                      <item.icon size={15} className="sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] sm:text-xs font-black text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${item.badgeColor || 'text-primary'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                        {item.subtitle}
                      </p>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground/60 mt-0.5 sm:mt-1 uppercase font-black block">
                        {item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile scroll cue */}
            {visibleItems.length > 3 && (
              <div className="sm:hidden flex items-center justify-between text-[9px] text-muted-foreground/60 font-semibold px-1 pt-1.5">
                <span>↓ Scroll for more</span>
                <span>{visibleItems.length} total</span>
              </div>
            )}

            {/* Bottom Actions: View All Activity & Hub Shortcut */}
            <div className="mt-2.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-border/40 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <button 
                type="button"
                onClick={() => setShowAllActivities(!showAllActivities)}
                className="flex-1 py-2 sm:py-2.5 px-3 bg-background border border-border hover:bg-muted/50 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {showAllActivities ? (
                  <>
                    <ChevronUp size={14} /> Show Less (8)
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> View All Activity {filteredFeed.length > 8 ? `(${filteredFeed.length})` : ''}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/crm/notes')}
                className="py-2 sm:py-2.5 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary transition-all flex items-center justify-center gap-1 shadow-xs"
                title="Open full interaction logs hub"
              >
                Hub <ArrowUpRight size={14} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
