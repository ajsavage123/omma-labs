import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  Sun,
  Snowflake,
  ShieldCheck,
  UserCheck,
  Award,
  Users,
  MapPin,
  Search,
  PhoneForwarded,
  Building,
  UserPlus,
  Globe,
  Linkedin,
  Zap,
  Phone,
  MessageCircle,
  Mail,
  Video,
  Calendar,
  Briefcase,
  Layers,
  Calculator,
  TrendingUp,
  BarChart3,
  Send,
  Loader2,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCRMData } from '@/contexts/CRMDataContext';
import {
  SEVEN_DAY_SALES_PLAN,
  getCycleInfo,
  crmSalesPlanService,
  type ActualCrmMetrics,
  type WeeklyReportData,
  type PlanTool
} from '@/services/crmSalesPlanService';
import CRMQuickActivityModal from '@/components/crm/CRMQuickActivityModal';
import CRMQuickClassifyModal from '@/components/crm/CRMQuickClassifyModal';
import CRMPortfolioShareModal from '@/components/crm/CRMPortfolioShareModal';
import CRMWeeklyReportModal from '@/components/crm/CRMWeeklyReportModal';
import { toast } from 'sonner';

// High-Contrast Day Themes with customized icons & borders
const DAY_THEMES: Record<number, {
  name: string;
  shortName: string;
  borderColor: string;
  activeBorderColor: string;
  activeBg: string;
  badgeBg: string;
  stepIcon: string;
  accentColor: string;
}> = {
  1: {
    name: 'Lead Generation (Part 1)',
    shortName: 'Local Discovery',
    borderColor: 'border-emerald-600/40',
    activeBorderColor: 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/40',
    activeBg: 'bg-emerald-950/20',
    badgeBg: 'bg-emerald-600 text-white',
    stepIcon: '🔍',
    accentColor: 'text-emerald-400',
  },
  2: {
    name: 'Lead Generation (Part 2)',
    shortName: 'Digital & Lists',
    borderColor: 'border-cyan-600/40',
    activeBorderColor: 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-2 ring-cyan-500/40',
    activeBg: 'bg-cyan-950/20',
    badgeBg: 'bg-cyan-600 text-white',
    stepIcon: '🌐',
    accentColor: 'text-cyan-400',
  },
  3: {
    name: 'Research & Qualification',
    shortName: 'Outreach & First Contact',
    borderColor: 'border-purple-600/40',
    activeBorderColor: 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)] ring-2 ring-purple-500/40',
    activeBg: 'bg-purple-950/20',
    badgeBg: 'bg-purple-600 text-white',
    stepIcon: '✉️',
    accentColor: 'text-purple-400',
  },
  4: {
    name: 'Direct Outreach & Calls',
    shortName: 'Follow Ups & Meetings',
    borderColor: 'border-blue-600/40',
    activeBorderColor: 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/40',
    activeBg: 'bg-blue-950/20',
    badgeBg: 'bg-blue-600 text-white',
    stepIcon: '👥',
    accentColor: 'text-blue-400',
  },
  5: {
    name: 'Discovery Meetings & Demos',
    shortName: 'Proposals & Demos',
    borderColor: 'border-teal-600/40',
    activeBorderColor: 'border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-2 ring-teal-500/40',
    activeBg: 'bg-teal-950/20',
    badgeBg: 'bg-teal-600 text-white',
    stepIcon: '📊',
    accentColor: 'text-teal-400',
  },
  6: {
    name: 'Portfolio & Proposals',
    shortName: 'Close & Pipeline',
    borderColor: 'border-rose-600/40',
    activeBorderColor: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/40',
    activeBg: 'bg-rose-950/20',
    badgeBg: 'bg-rose-600 text-white',
    stepIcon: '⚙️',
    accentColor: 'text-rose-400',
  },
  7: {
    name: 'Audit, Reporting & Wrap-Up',
    shortName: 'Review & Next Steps',
    borderColor: 'border-amber-500/40',
    activeBorderColor: 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/40',
    activeBg: 'bg-amber-950/20',
    badgeBg: 'bg-amber-600 text-white',
    stepIcon: '🏆',
    accentColor: 'text-amber-400',
  }
};

export default function CRMSalesPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { teamMembers, refreshLeads, refreshActivities, refreshTasks } = useCRMData();

  // Cycle navigation state
  const [cycleOffsetWeeks, setCycleOffsetWeeks] = useState<number>(0);
  const cycleInfo = useMemo(() => getCycleInfo(cycleOffsetWeeks), [cycleOffsetWeeks]);

  // Today's actual day in cycle (1 to 7)
  const todayDayNumber = useMemo(() => {
    return cycleOffsetWeeks === 0 ? cycleInfo.currentDayNumber : 1;
  }, [cycleOffsetWeeks, cycleInfo.currentDayNumber]);

  // Accordion drop section state: Map of { [dayNumber]: boolean }
  // By default, open the current day (Today) automatically!
  const [openDays, setOpenDays] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
    const currentDay = cycleOffsetWeeks === 0 ? cycleInfo.currentDayNumber : 1;
    initial[currentDay] = true;
    return initial;
  });

  // Toggle individual day dropdown
  const toggleDay = (dayNum: number) => {
    setOpenDays(prev => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  // Expand all / Collapse all helper
  const handleToggleAllDays = (expand: boolean) => {
    const nextState: Record<number, boolean> = {};
    for (let i = 1; i <= 7; i++) {
      nextState[i] = expand;
    }
    setOpenDays(nextState);
  };

  const isAllExpanded = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7].every(d => openDays[d]);
  }, [openDays]);

  // Guide accordion toggle
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Role and Target User View
  const [targetUserId, setTargetUserId] = useState<string>(user?.id || '');
  const [isManagerAuditMode, setIsManagerAuditMode] = useState<boolean>(false);

  // Task progress state map: { [taskId]: boolean }
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [loadingProgress, setLoadingProgress] = useState<boolean>(true);

  // Live CRM DB Verification metrics
  const [actualMetrics, setActualMetrics] = useState<ActualCrmMetrics>({
    leadsCreatedCount: 0,
    hotLeadsCount: 0,
    warmLeadsCount: 0,
    coldLeadsCount: 0,
    activitiesCount: 0,
    callsCount: 0,
    whatsAppCount: 0,
    emailsCount: 0,
    meetingsBookedCount: 0,
    dealsProgressedCount: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);

  // Day 7 Report Data
  const [submittedReport, setSubmittedReport] = useState<WeeklyReportData | null>(null);
  const [managerFeedback, setManagerFeedback] = useState<string>('');
  const [reviewingReport, setReviewingReport] = useState<boolean>(false);

  // Modals state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityDefaultType, setActivityDefaultType] = useState<'call' | 'whatsapp' | 'email' | 'meeting' | 'note'>('call');
  const [classifyModalOpen, setClassifyModalOpen] = useState(false);
  const [classifyDefaultRating, setClassifyDefaultRating] = useState<'Hot' | 'Warm' | 'Cold'>('Hot');
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Sync user ID on login
  useEffect(() => {
    if (user?.id && !targetUserId) {
      setTargetUserId(user.id);
    }
  }, [user?.id, targetUserId]);

  // When cycle changes, ensure today's day is open
  useEffect(() => {
    setOpenDays(prev => ({
      ...prev,
      [todayDayNumber]: true
    }));
  }, [todayDayNumber]);

  // Load progress and actual metrics whenever target user or cycle changes
  const loadPlanData = useCallback(async () => {
    if (!user?.workspace_id || !targetUserId) return;
    setLoadingProgress(true);
    setLoadingMetrics(true);

    try {
      const [progress, metrics, report] = await Promise.all([
        crmSalesPlanService.fetchCycleProgress(user.workspace_id, targetUserId, cycleInfo.cycleStartDate),
        crmSalesPlanService.computeActualCrmMetrics(
          user.workspace_id,
          targetUserId,
          cycleInfo.cycleStartDate,
          cycleInfo.cycleEndDate
        ),
        crmSalesPlanService.fetchWeeklyReport(user.workspace_id, targetUserId, cycleInfo.cycleStartDate)
      ]);

      setProgressMap(progress);
      setActualMetrics(metrics);
      setSubmittedReport(report);
      if (report?.managerFeedback) {
        setManagerFeedback(report.managerFeedback);
      }
    } catch (err) {
      console.error("Failed loading 7-day sales plan data", err);
    } finally {
      setLoadingProgress(false);
      setLoadingMetrics(false);
    }
  }, [user?.workspace_id, targetUserId, cycleInfo.cycleStartDate, cycleInfo.cycleEndDate]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  // Calculate overall cycle completion percentage
  const allTasks = useMemo(() => SEVEN_DAY_SALES_PLAN.flatMap(d => d.tasks), []);
  const completedTasksCount = useMemo(() => {
    return allTasks.filter(t => progressMap[t.id]).length;
  }, [allTasks, progressMap]);
  const progressPercent = Math.round((completedTasksCount / (allTasks.length || 1)) * 100);

  // Task toggle handler
  const handleToggleTask = async (dayNumber: number, taskId: string) => {
    if (!user?.workspace_id || !targetUserId) return;
    if (isManagerAuditMode && targetUserId !== user.id) {
      toast.info("Manager Audit Mode: You are viewing rep progress. Toggle your own tasks in 'My Plan'.");
      return;
    }

    const currentVal = !!progressMap[taskId];
    setProgressMap(prev => ({ ...prev, [taskId]: !currentVal }));

    try {
      const result = await crmSalesPlanService.toggleTask(
        user.workspace_id,
        targetUserId,
        cycleInfo.cycleStartDate,
        dayNumber,
        taskId,
        currentVal
      );
      if (result) {
        toast.success("Task updated!");
      }
    } catch {
      setProgressMap(prev => ({ ...prev, [taskId]: currentVal }));
      toast.error("Could not update task");
    }
  };

  // Inline tool click dispatcher
  const handleToolClick = (tool: PlanTool) => {
    if (tool.category === 'external' && tool.url) {
      window.open(tool.url, '_blank');
      return;
    }

    switch (tool.actionKey) {
      case 'quick_add_lead':
        navigate('/crm/leads?action=new');
        break;
      case 'open_leads_directory':
        navigate('/crm/leads');
        break;
      case 'open_csv_import':
        navigate('/crm/leads?tab=import');
        break;
      case 'classify_lead_hot':
        setClassifyDefaultRating('Hot');
        setClassifyModalOpen(true);
        break;
      case 'classify_lead_warm':
        setClassifyDefaultRating('Warm');
        setClassifyModalOpen(true);
        break;
      case 'classify_lead_cold':
        setClassifyDefaultRating('Cold');
        setClassifyModalOpen(true);
        break;
      case 'log_activity_call':
        setActivityDefaultType('call');
        setActivityModalOpen(true);
        break;
      case 'log_activity_whatsapp':
        setActivityDefaultType('whatsapp');
        setActivityModalOpen(true);
        break;
      case 'log_activity_email':
        setActivityDefaultType('email');
        setActivityModalOpen(true);
        break;
      case 'log_activity_note':
        setActivityDefaultType('note');
        setActivityModalOpen(true);
        break;
      case 'schedule_crm_meeting':
        navigate('/crm/tasks?action=new_meeting');
        break;
      case 'open_crm_calendar':
        navigate('/crm/calendar');
        break;
      case 'share_oomalabs_portfolio':
        setPortfolioModalOpen(true);
        break;
      case 'open_service_menu':
        navigate('/service-menu');
        break;
      case 'open_quotation_generator':
        navigate('/quotation');
        break;
      case 'open_crm_pipeline':
        navigate('/crm/pipeline');
        break;
      case 'open_crm_reports':
        navigate('/crm/reports');
        break;
      case 'open_audit_modal':
      case 'submit_weekly_report':
        setReportModalOpen(true);
        break;
      default:
        break;
    }
  };

  // Manager Review Handler
  const handleManagerReview = async (status: 'Approved' | 'Needs Improvement') => {
    if (!user?.workspace_id || !targetUserId) return;
    setReviewingReport(true);
    try {
      const ok = await crmSalesPlanService.reviewWeeklyReport(
        user.workspace_id,
        targetUserId,
        cycleInfo.cycleStartDate,
        user.id,
        status,
        managerFeedback.trim() || `Reviewed and ${status.toLowerCase()} by manager.`
      );
      if (ok) {
        toast.success(`Weekly Report marked as ${status}!`);
        loadPlanData();
      }
    } catch {
      toast.error("Failed to submit manager feedback");
    } finally {
      setReviewingReport(false);
    }
  };

  // Render Tool Icon dynamically
  const renderToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'map-pin': return <MapPin className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'search': return <Search className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'phone-forwarded': return <PhoneForwarded className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'building': return <Building className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'user-plus': return <UserPlus className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'users': return <Users className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'globe': return <Globe className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'linkedin': return <Linkedin className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'zap': return <Zap className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'flame': return <Flame className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'sun': return <Sun className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'snowflake': return <Snowflake className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'phone': return <Phone className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'message-circle': return <MessageCircle className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'mail': return <Mail className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'video': return <Video className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'calendar': return <Calendar className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'calendar-plus': return <Calendar className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'briefcase': return <Briefcase className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'layers': return <Layers className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'calculator': return <Calculator className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'trending-up': return <TrendingUp className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'bar-chart-3': return <BarChart3 className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'check-circle-2': return <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />;
      case 'send': return <Send className="w-3.5 h-3.5 text-white shrink-0" />;
      default: return <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />;
    }
  };

  // High contrast button styles
  const getToolButtonStyle = (tool: PlanTool) => {
    if (tool.name.includes('Hot')) {
      return 'bg-red-600 hover:bg-red-700 text-white font-bold border border-red-500 shadow-xs';
    }
    if (tool.name.includes('Warm')) {
      return 'bg-amber-600 hover:bg-amber-700 text-white font-bold border border-amber-500 shadow-xs';
    }
    if (tool.name.includes('Cold')) {
      return 'bg-sky-600 hover:bg-sky-700 text-white font-bold border border-sky-500 shadow-xs';
    }
    if (tool.name.includes('WhatsApp')) {
      return 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-500 shadow-xs';
    }
    if (tool.name.includes('Phone') || tool.name.includes('Call')) {
      return 'bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-500 shadow-xs';
    }
    if (tool.name.includes('CRM') || tool.primary) {
      return 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold border border-indigo-500 shadow-xs';
    }
    return 'bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 shadow-xs';
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-12 animate-in fade-in duration-200 w-full max-w-full min-w-0 font-sans">
      
      {/* ─── 1. COMPACT TOP HEADER & NAVIGATION ─── */}
      <div className="bg-[#111625] border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        
        {/* Top Line: Title + Week Stepper + Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                  7-Day Sales Plan
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  Weekly Cadence
                </span>
              </div>
            </div>
          </div>

          {/* Stepper + Completion Badge + Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            
            {/* Week Stepper */}
            <div className="flex items-center bg-[#0a0d18] border border-slate-800 rounded-xl p-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                onClick={() => setCycleOffsetWeeks(prev => prev - 1)}
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-white px-2.5 whitespace-nowrap">
                {cycleInfo.displayLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                onClick={() => setCycleOffsetWeeks(prev => prev + 1)}
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Overall Progress Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0d18] border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
              <span className="text-emerald-400 font-black">{completedTasksCount}/{allTasks.length}</span>
              <span className="text-slate-400 text-[10px]">({progressPercent}%)</span>
            </div>

            {/* Mode Switcher: My Plan / Manager Audit */}
            {isAdmin && (
              <div className="flex items-center bg-[#0a0d18] p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsManagerAuditMode(false);
                    setTargetUserId(user?.id || '');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    !isManagerAuditMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  My Plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManagerAuditMode(true);
                    if (teamMembers.length > 0 && targetUserId === user?.id) {
                      setTargetUserId(teamMembers[0]?.id || user?.id);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isManagerAuditMode
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audit Reps</span>
                </button>
              </div>
            )}

            {/* Guide Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuide(!showGuide)}
              className="h-8 px-2.5 text-xs font-bold text-slate-300 hover:text-white bg-[#0a0d18] border border-slate-800 rounded-xl gap-1"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </Button>

            {/* Sync DB Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-[#0a0d18] border border-slate-800 text-slate-300 hover:text-white rounded-xl"
              onClick={() => {
                loadPlanData();
                refreshLeads();
                refreshActivities();
                refreshTasks();
                toast.success("Synchronized with CRM database");
              }}
              title="Sync with CRM Database"
            >
              <RefreshCw className={`w-4 h-4 ${loadingProgress || loadingMetrics ? 'animate-spin text-indigo-400' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ─── 2. 2x2 / 4-COL COMPACT KPI METRIC CARDS ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
          <div className="bg-[#0a0d18] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Weekly Progress</span>
              <div className="text-sm sm:text-base font-black text-white">{progressPercent}% <span className="text-[10px] text-slate-400 font-normal">({completedTasksCount}/{allTasks.length})</span></div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></div>
          </div>

          <div className="bg-[#0a0d18] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Leads Created</span>
              <div className="text-sm sm:text-base font-black text-emerald-400">{actualMetrics.leadsCreatedCount} <span className="text-[10px] text-slate-400 font-normal">({actualMetrics.hotLeadsCount}🔥 {actualMetrics.warmLeadsCount}☀️)</span></div>
            </div>
            <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-[#0a0d18] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Outreach Logged</span>
              <div className="text-sm sm:text-base font-black text-blue-400">{actualMetrics.activitiesCount} <span className="text-[10px] text-slate-400 font-normal">({actualMetrics.callsCount}📞 {actualMetrics.whatsAppCount}💬)</span></div>
            </div>
            <Phone className="w-4 h-4 text-blue-400 shrink-0" />
          </div>

          <div className="bg-[#0a0d18] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Meetings & Deals</span>
              <div className="text-sm sm:text-base font-black text-purple-400">{actualMetrics.meetingsBookedCount} Mtgs <span className="text-[10px] text-slate-400 font-normal">/ {actualMetrics.dealsProgressedCount} Won</span></div>
            </div>
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Guide Accordion */}
      {showGuide && (
        <Card className="p-3 sm:p-4 bg-[#111625] border border-slate-800 rounded-2xl shadow-md space-y-2 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>7-Day Sales Operating Rhythm</span>
            </div>
            <span className="text-[10px] text-slate-400">Expand each day section to view and execute tasks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {[
              { day: 'Day 1', label: 'Local Search', icon: '🔍' },
              { day: 'Day 2', label: 'B2B Lists', icon: '🌐' },
              { day: 'Day 3', label: 'Qualify Hot/Warm', icon: '✉️' },
              { day: 'Day 4', label: 'Direct Calls & WA', icon: '👥' },
              { day: 'Day 5', label: 'Demos & Meetings', icon: '📊' },
              { day: 'Day 6', label: 'Quote & Portfolio', icon: '⚙️' },
              { day: 'Day 7', label: 'Audit & Report', icon: '🏆' },
            ].map(item => (
              <div key={item.day} className="p-2 rounded-xl bg-[#0a0d18] border border-slate-800 text-center">
                <div className="text-base">{item.icon}</div>
                <div className="text-[11px] font-black text-white">{item.day}</div>
                <div className="text-[10px] text-slate-300 truncate">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Manager Audit Bar */}
      {isManagerAuditMode && (
        <div className="p-2.5 bg-[#111625] border border-amber-600/60 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">Auditing Rep:</span>
            <select
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              className="bg-[#0a0d18] border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:ring-1 focus:ring-amber-500"
            >
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.username} ({m.designation || m.role})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-slate-300 font-medium hidden md:inline">
            Comparing checklist progress against actual database leads, calls & meetings.
          </span>
        </div>
      )}

      {/* ─── 3. 7-DAY DROP SECTIONS / ACCORDIONS LIST ─── */}
      <div className="space-y-2.5">
        
        {/* Section Header with Expand/Collapse All Button */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                7-Day Structured Schedule & Execution Matrix
              </h2>
              <p className="text-[10px] text-slate-400">Click day drop section to expand • Click checkbox to mark done</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleAllDays(!isAllExpanded)}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white bg-[#111625] border border-slate-800 px-2.5 py-1 rounded-xl transition"
          >
            {isAllExpanded ? (
              <>
                <Minimize2 className="w-3 h-3 text-indigo-400" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-indigo-400" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>

        {/* 7 Days Accordion Drop Sections */}
        <div className="space-y-2">
          {SEVEN_DAY_SALES_PLAN.map(day => {
            const theme = DAY_THEMES[day.dayNumber] || DAY_THEMES[1];
            const isToday = cycleInfo.isCurrentCycle && cycleInfo.currentDayNumber === day.dayNumber;
            const isOpen = !!openDays[day.dayNumber];
            const dayTasks = day.tasks;
            const dayDoneCount = dayTasks.filter(t => progressMap[t.id]).length;
            const isDayFullyDone = dayDoneCount === dayTasks.length;

            return (
              <div
                key={day.dayNumber}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isToday
                    ? `${theme.activeBorderColor} ${theme.activeBg}`
                    : 'bg-[#111625] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* ── DAY ACCORDION HEADER TRIGGER ── */}
                <button
                  type="button"
                  onClick={() => toggleDay(day.dayNumber)}
                  className={`w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left transition-colors ${
                    isOpen ? 'bg-[#0e1320]' : 'hover:bg-[#151c2e]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-lg shrink-0">{theme.stepIcon}</span>
                    
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight whitespace-nowrap">
                        DAY {day.dayNumber}
                      </span>
                      <span className="text-slate-400 font-normal text-xs hidden sm:inline">•</span>
                      <span className="text-xs font-bold text-slate-300 truncate">
                        {theme.shortName}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] tracking-wider uppercase animate-pulse">
                          TODAY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Done count + Chevron */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                      isDayFullyDone
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}>
                      {dayDoneCount}/{dayTasks.length} Done
                    </span>

                    <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* ── DAY ACCORDION EXPANDED BODY (TASKS LIST) ── */}
                {isOpen && (
                  <div className="p-3 sm:p-4 border-t border-slate-800/80 space-y-2.5 bg-[#0a0d18] animate-in slide-in-from-top-2 duration-150">
                    
                    {dayTasks.map((task, tIdx) => {
                      const isDone = !!progressMap[task.id];

                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isDone
                              ? 'bg-[#111625]/60 border-slate-800/60 opacity-75'
                              : 'bg-[#111625] border-slate-800 hover:border-slate-700 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            
                            {/* Checkbox: Square Box with smooth checkmark */}
                            <button
                              type="button"
                              onClick={() => handleToggleTask(day.dayNumber, task.id)}
                              className={`mt-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm ${
                                isDone
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'bg-slate-900 border-slate-700 hover:border-indigo-400 text-transparent'
                              }`}
                              title={isDone ? "Mark as pending" : "Mark as completed"}
                            >
                              <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                            </button>

                            {/* Task Content */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
                                  #{tIdx + 1}
                                </span>
                                <h3 className={`text-xs sm:text-sm font-bold break-words ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {task.title}
                                </h3>
                              </div>

                              <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed break-words">
                                {task.objective}
                              </p>

                              {task.targetMetric && (
                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span className="truncate">{task.targetMetric}</span>
                                </div>
                              )}

                              {/* Action Launchers Shelves */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60 mt-2">
                                {task.recommendedTools.map(tool => (
                                  <button
                                    type="button"
                                    key={tool.id}
                                    onClick={() => handleToolClick(tool)}
                                    title={tool.tooltip}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${getToolButtonStyle(tool)}`}
                                  >
                                    {renderToolIcon(tool.icon)}
                                    <span className="truncate max-w-[150px]">{tool.name}</span>
                                    {tool.category === 'external' && <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Day 7 Special Submission Section inside Day 7 Dropdown */}
                    {day.dayNumber === 7 && (
                      <div className="mt-3 p-3.5 bg-[#111625] border border-slate-800 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-amber-400" />
                              Weekly Performance Audit & Submission
                            </h4>
                            <p className="text-[10px] text-slate-300">
                              Submit cycle outcomes for manager sign-off
                            </p>
                          </div>

                          <div>
                            {submittedReport ? (
                              <Badge
                                className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                                  submittedReport.managerStatus === 'Approved'
                                    ? 'bg-emerald-600 text-white'
                                    : submittedReport.managerStatus === 'Needs Improvement'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}
                              >
                                {submittedReport.managerStatus}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setReportModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7 px-3 rounded-lg"
                              >
                                Submit Weekly Report
                              </Button>
                            )}
                          </div>
                        </div>

                        {submittedReport && (
                          <div className="p-2.5 bg-[#0a0d18] border border-slate-800 rounded-lg space-y-1 text-xs">
                            <div className="text-white">
                              <strong className="text-amber-400">Notes:</strong> {submittedReport.summaryNotes}
                            </div>
                            {submittedReport.managerFeedback && (
                              <div className="text-emerald-400 pt-1 border-t border-slate-800">
                                <strong>Manager Feedback:</strong> {submittedReport.managerFeedback}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Manager Sign-off Controls in Audit Mode */}
                        {isManagerAuditMode && isAdmin && (
                          <div className="p-3 bg-[#0a0d18] border border-amber-600/60 rounded-xl space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                              Manager Sign-off Action
                            </span>
                            <textarea
                              rows={2}
                              value={managerFeedback}
                              onChange={e => setManagerFeedback(e.target.value)}
                              placeholder="Enter feedback for the sales rep..."
                              className="w-full bg-[#111625] border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={reviewingReport}
                                onClick={() => handleManagerReview('Needs Improvement')}
                                className="text-xs bg-red-950 text-red-300 border-red-800 hover:bg-red-900 font-bold rounded-lg h-7 px-2.5"
                              >
                                Flag Revision
                              </Button>
                              <Button
                                size="sm"
                                disabled={reviewingReport}
                                onClick={() => handleManagerReview('Approved')}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg h-7 px-3 shadow-xs"
                              >
                                {reviewingReport ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Approve Performance
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Modals */}
      <CRMQuickActivityModal
        isOpen={activityModalOpen}
        onClose={() => {
          setActivityModalOpen(false);
          loadPlanData();
        }}
        defaultType={activityDefaultType}
      />

      <CRMQuickClassifyModal
        isOpen={classifyModalOpen}
        onClose={() => {
          setClassifyModalOpen(false);
          loadPlanData();
        }}
        defaultRating={classifyDefaultRating}
      />

      <CRMPortfolioShareModal
        isOpen={portfolioModalOpen}
        onClose={() => setPortfolioModalOpen(false)}
      />

      <CRMWeeklyReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          loadPlanData();
        }}
        workspaceId={user?.workspace_id || ''}
        userId={targetUserId || user?.id || ''}
        cycleStartDate={cycleInfo.cycleStartDate}
        cycleEndDate={cycleInfo.cycleEndDate}
        metrics={actualMetrics}
        onSubmitted={() => {
          loadPlanData();
          toast.success("Weekly report recorded!");
        }}
      />
    </div>
  );
}
