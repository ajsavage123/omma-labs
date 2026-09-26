import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck2,
  CheckCircle2,
  Circle,
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
  Table as TableIcon,
  ListTodo,
  ArrowRight
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

// Solid High-Contrast Day Themes
const DAY_THEMES: Record<number, {
  name: string;
  shortName: string;
  borderColor: string;
  badgeBg: string;
  pillActiveBg: string;
  stepIcon: string;
  accentText: string;
}> = {
  1: {
    name: 'Local Discovery & Search',
    shortName: 'Local Discovery',
    borderColor: 'border-emerald-600',
    badgeBg: 'bg-emerald-600 text-white',
    pillActiveBg: 'bg-emerald-600 text-white shadow-md',
    stepIcon: '🔍',
    accentText: 'text-emerald-400',
  },
  2: {
    name: 'Digital Directories & Lists',
    shortName: 'Digital & Lists',
    borderColor: 'border-purple-600',
    badgeBg: 'bg-purple-600 text-white',
    pillActiveBg: 'bg-purple-600 text-white shadow-md',
    stepIcon: '🌐',
    accentText: 'text-purple-400',
  },
  3: {
    name: 'Deep Research & Lead Scoring',
    shortName: 'Research & Scoring',
    borderColor: 'border-blue-600',
    badgeBg: 'bg-blue-600 text-white',
    pillActiveBg: 'bg-blue-600 text-white shadow-md',
    stepIcon: '🎯',
    accentText: 'text-blue-400',
  },
  4: {
    name: 'Direct Outreach & Cold Calling',
    shortName: 'Direct Outreach',
    borderColor: 'border-amber-600',
    badgeBg: 'bg-amber-600 text-white',
    pillActiveBg: 'bg-amber-600 text-white shadow-md',
    stepIcon: '📞',
    accentText: 'text-amber-400',
  },
  5: {
    name: 'Discovery Meetings & Demos',
    shortName: 'Meetings & Demos',
    borderColor: 'border-indigo-600',
    badgeBg: 'bg-indigo-600 text-white',
    pillActiveBg: 'bg-indigo-600 text-white shadow-md',
    stepIcon: '🤝',
    accentText: 'text-indigo-400',
  },
  6: {
    name: 'Portfolio & Formal Proposals',
    shortName: 'Portfolio & Quote',
    borderColor: 'border-rose-600',
    badgeBg: 'bg-rose-600 text-white',
    pillActiveBg: 'bg-rose-600 text-white shadow-md',
    stepIcon: '📄',
    accentText: 'text-rose-400',
  },
  7: {
    name: 'Audit, Reporting & Wrap-Up',
    shortName: 'Audit & Review',
    borderColor: 'border-amber-500',
    badgeBg: 'bg-amber-600 text-white',
    pillActiveBg: 'bg-amber-600 text-white shadow-md',
    stepIcon: '🏆',
    accentText: 'text-amber-400',
  }
};

export default function CRMSalesPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { teamMembers, refreshLeads, refreshActivities, refreshTasks } = useCRMData();

  // View Mode: 'table' (Organized 7-Day Table Matrix) | 'day' (Day-by-Day focused checklist)
  const [viewMode, setViewMode] = useState<'table' | 'day'>('table');

  // Cycle navigation state
  const [cycleOffsetWeeks, setCycleOffsetWeeks] = useState<number>(0);
  const cycleInfo = useMemo(() => getCycleInfo(cycleOffsetWeeks), [cycleOffsetWeeks]);

  // Active day selection (1 to 7)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => {
    return cycleOffsetWeeks === 0 ? cycleInfo.currentDayNumber : 1;
  });

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

  // Active day plan details for Day Focus view
  const currentDayPlan = useMemo(() => {
    return SEVEN_DAY_SALES_PLAN.find(d => d.dayNumber === selectedDayNumber) || SEVEN_DAY_SALES_PLAN[0];
  }, [selectedDayNumber]);

  const activeTheme = DAY_THEMES[selectedDayNumber] || DAY_THEMES[1];

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
    <div className="space-y-2.5 sm:space-y-4 pb-8 animate-in fade-in duration-200 w-full max-w-full min-w-0">
      
      {/* ─── 1. COMPACT UNIFIED CONTROL TOOLBAR ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        
        {/* Left: Title + Week Cycle Stepper + Progress Pill */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <CalendarCheck2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase whitespace-nowrap">
                7-Day Sales Plan
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hidden sm:inline">
                Weekly Cadence
              </span>
            </div>
          </div>

          {/* Week Stepper */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0 ml-auto sm:ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              onClick={() => setCycleOffsetWeeks(prev => prev - 1)}
              title="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-bold text-white px-2 whitespace-nowrap">
              {cycleInfo.displayLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
              onClick={() => setCycleOffsetWeeks(prev => prev + 1)}
              title="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-300 shrink-0">
            <span className="text-emerald-400 font-black">{completedTasksCount}/{allTasks.length}</span>
            <span className="text-slate-400 text-[10px]">({progressPercent}%)</span>
          </div>
        </div>

        {/* Right: View Mode Switcher + Manager Audit Toggle + Sync & Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          
          {/* View Mode Toggle: Table vs Day Checklist */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">7-Day Matrix Table</span>
              <span className="sm:hidden">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'day'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Day Checklist</span>
              <span className="sm:hidden">Day View</span>
            </button>
          </div>

          {/* Admin / Manager Audit Toggle */}
          {isAdmin && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsManagerAuditMode(false);
                  setTargetUserId(user?.id || '');
                }}
                className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                  !isManagerAuditMode
                    ? 'bg-primary text-primary-foreground shadow-xs'
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
                className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
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
            className="h-7 px-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Guide</span>
          </Button>

          {/* Sync DB Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-lg"
            onClick={() => {
              loadPlanData();
              refreshLeads();
              refreshActivities();
              refreshTasks();
              toast.success("Synchronized with CRM database");
            }}
            title="Sync with CRM Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingProgress || loadingMetrics ? 'animate-spin text-indigo-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ─── 2. COMPACT SINGLE-LINE KPI STATS BAR ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-xs">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Weekly Progress</span>
            <div className="text-sm sm:text-base font-black text-white">{progressPercent}% <span className="text-[10px] text-slate-400 font-normal">({completedTasksCount}/{allTasks.length})</span></div>
          </div>
          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-xs">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Leads Created</span>
            <div className="text-sm sm:text-base font-black text-emerald-400">{actualMetrics.leadsCreatedCount} <span className="text-[10px] text-slate-400 font-normal">({actualMetrics.hotLeadsCount}🔥 {actualMetrics.warmLeadsCount}☀️)</span></div>
          </div>
          <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-xs">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Outreach Logged</span>
            <div className="text-sm sm:text-base font-black text-blue-400">{actualMetrics.activitiesCount} <span className="text-[10px] text-slate-400 font-normal">({actualMetrics.callsCount}📞 {actualMetrics.whatsAppCount}💬)</span></div>
          </div>
          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-xs">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Meetings & Deals</span>
            <div className="text-sm sm:text-base font-black text-purple-400">{actualMetrics.meetingsBookedCount} Mtgs <span className="text-[10px] text-slate-400 font-normal">/ {actualMetrics.dealsProgressedCount} Won</span></div>
          </div>
          <Award className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        </div>
      </div>

      {/* Collapsible Quick Guide */}
      {showGuide && (
        <Card className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-md space-y-2 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>7-Day Sales Operating Rhythm</span>
            </div>
            <span className="text-[10px] text-slate-400">Step-by-Step System</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {[
              { day: 'Day 1', label: 'Local Maps', icon: '🔍' },
              { day: 'Day 2', label: 'B2B Lists', icon: '🌐' },
              { day: 'Day 3', label: 'Qualify Hot/Warm', icon: '🎯' },
              { day: 'Day 4', label: 'Direct Calls & WA', icon: '📞' },
              { day: 'Day 5', label: 'Demos & Meetings', icon: '🤝' },
              { day: 'Day 6', label: 'Quote & Portfolio', icon: '📄' },
              { day: 'Day 7', label: 'Audit & Report', icon: '🏆' },
            ].map(item => (
              <div key={item.day} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <div className="text-sm">{item.icon}</div>
                <div className="text-[10px] font-black text-white">{item.day}</div>
                <div className="text-[9px] text-slate-300 truncate">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Manager Audit Selector Banner */}
      {isManagerAuditMode && (
        <div className="p-2.5 bg-slate-900 border border-amber-600/60 rounded-xl flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">Auditing Rep:</span>
            <select
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:ring-1 focus:ring-amber-500"
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

      {/* ─── 3. VIEW MODE: 7-DAY ORGANIZED MATRIX TABLE ─── */}
      {viewMode === 'table' && (
        <Card className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                7-Day Structured Schedule & Execution Matrix
              </h2>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Click task to toggle • Launch direct tools</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3 w-[160px]">Day & Cadence</th>
                  <th className="py-2.5 px-3">Structured Tasks & Objectives</th>
                  <th className="py-2.5 px-3 w-[150px]">Target Metric</th>
                  <th className="py-2.5 px-3 w-[220px]">Direct Action Launchers</th>
                  <th className="py-2.5 px-3 w-[100px] text-center">Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {SEVEN_DAY_SALES_PLAN.map(day => {
                  const theme = DAY_THEMES[day.dayNumber] || DAY_THEMES[1];
                  const isToday = cycleInfo.isCurrentCycle && cycleInfo.currentDayNumber === day.dayNumber;
                  const dayTasks = day.tasks;
                  const dayDoneCount = dayTasks.filter(t => progressMap[t.id]).length;
                  const isDayFullyDone = dayDoneCount === dayTasks.length;

                  return (
                    <tr 
                      key={day.dayNumber} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isToday ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Column 1: Day & Cadence Name */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{theme.stepIcon}</span>
                            <span className="font-black text-white text-xs uppercase tracking-tight">
                              Day {day.dayNumber}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-black text-[9px]">
                                TODAY
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-300 leading-tight">
                            {theme.shortName}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
                            <span className={isDayFullyDone ? 'text-emerald-400 font-bold' : ''}>
                              {dayDoneCount}/{dayTasks.length} Done
                            </span>
                            {isDayFullyDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Structured Tasks & Checkboxes */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-2">
                          {dayTasks.map((task, tIdx) => {
                            const isDone = !!progressMap[task.id];
                            return (
                              <div 
                                key={task.id} 
                                className={`p-2 rounded-lg border transition-all flex items-start gap-2.5 ${
                                  isDone 
                                    ? 'bg-slate-950/60 border-slate-800 opacity-80' 
                                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(day.dayNumber, task.id)}
                                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'bg-slate-800 border-slate-600 hover:border-indigo-400 text-transparent'
                                  }`}
                                  title={isDone ? "Mark as pending" : "Mark as completed"}
                                >
                                  <Check className={`w-3 h-3 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-indigo-400 shrink-0">#{tIdx + 1}</span>
                                    <h4 className={`text-xs font-bold leading-tight ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                                      {task.title}
                                    </h4>
                                  </div>
                                  <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-snug">
                                    {task.objective}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Column 3: Target Metric */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1.5">
                          {dayTasks.map(task => (
                            task.targetMetric ? (
                              <div key={task.id} className="text-[10px] font-bold text-slate-200 bg-slate-950 border border-slate-800 px-2 py-1 rounded">
                                {task.targetMetric.replace('Target: ', '')}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </td>

                      {/* Column 4: Direct Action Launchers */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          {/* Aggregate unique tools for the day */}
                          {Array.from(new Map(dayTasks.flatMap(t => t.recommendedTools).map(tool => [tool.name, tool])).values()).map(tool => (
                            <button
                              type="button"
                              key={tool.id}
                              onClick={() => handleToolClick(tool)}
                              title={tool.tooltip}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${getToolButtonStyle(tool)}`}
                            >
                              {renderToolIcon(tool.icon)}
                              <span className="truncate max-w-[120px]">{tool.name}</span>
                              {tool.category === 'external' && <ExternalLink className="w-2.5 h-2.5 opacity-80" />}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Column 5: Focus Day Button */}
                      <td className="py-3 px-3 align-top text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDayNumber(day.dayNumber);
                            setViewMode('day');
                          }}
                          className="h-8 px-2 text-xs font-bold text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg gap-1 border border-indigo-500/30"
                        >
                          <span>Focus</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 4. VIEW MODE: DAY-BY-DAY FOCUSED CHECKLIST ─── */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          
          {/* Day Navigation Tabs Strip */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-1.5 sm:gap-2 pb-1 custom-scrollbar">
            {SEVEN_DAY_SALES_PLAN.map(day => {
              const isSelected = selectedDayNumber === day.dayNumber;
              const isToday = cycleInfo.isCurrentCycle && cycleInfo.currentDayNumber === day.dayNumber;
              const theme = DAY_THEMES[day.dayNumber] || DAY_THEMES[1];
              const dayTasks = day.tasks;
              const dayDoneCount = dayTasks.filter(t => progressMap[t.id]).length;
              const dayCompleted = dayDoneCount === dayTasks.length;

              return (
                <button
                  type="button"
                  key={day.dayNumber}
                  onClick={() => setSelectedDayNumber(day.dayNumber)}
                  className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between min-w-[125px] sm:min-w-0 flex-1 snap-center shrink-0 ${
                    isSelected
                      ? `${theme.pillActiveBg} ${theme.borderColor} ring-2 ring-white/20`
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1 text-xs font-black uppercase">
                      <span>{theme.stepIcon}</span>
                      <span>Day {day.dayNumber}</span>
                    </div>
                    {isToday && (
                      <span className="px-1 py-0 rounded bg-emerald-500 text-slate-950 font-black text-[8px]">
                        TODAY
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold truncate text-slate-200">
                    {theme.shortName}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold pt-1 mt-1 border-t border-slate-700/60 text-slate-300">
                    <span>{dayDoneCount}/{dayTasks.length}</span>
                    {dayCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 opacity-40" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Detail Card */}
          <Card className={`p-3 sm:p-5 bg-slate-900 border ${activeTheme.borderColor} rounded-xl shadow-md space-y-3 sm:space-y-4`}>
            
            {/* Active Day Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activeTheme.stepIcon}</span>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Day {currentDayPlan.dayNumber}: {currentDayPlan.title}
                  </h2>
                  <Badge className={`${activeTheme.badgeBg} text-[10px] font-black px-2 py-0.5 rounded`}>
                    {currentDayPlan.badge}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  {currentDayPlan.subtitle}
                </p>
              </div>

              <div className="text-[11px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                Week: {cycleInfo.displayLabel}
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-2.5">
              {currentDayPlan.tasks.map((task, idx) => {
                const isDone = !!progressMap[task.id];

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-slate-950 border-slate-800 opacity-75'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 w-full min-w-0">
                      
                      {/* Checkbox & Task info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(currentDayPlan.dayNumber, task.id)}
                          className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 shadow-xs ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-800 border-slate-600 hover:border-indigo-400 text-transparent'
                          }`}
                          title={isDone ? "Mark as pending" : "Mark as completed"}
                        >
                          <Check className={`w-3.5 h-3.5 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-600 text-white shadow-xs shrink-0">
                              Task #{idx + 1}
                            </span>
                            <h3 className={`text-sm sm:text-base font-bold break-words ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                              {task.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed break-words">
                            {task.objective}
                          </p>
                          {task.targetMetric && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
                              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{task.targetMetric}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Tools Shelf */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 lg:pt-0 lg:pl-3 border-t lg:border-t-0 border-slate-800/80 w-full lg:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 hidden lg:inline">
                          ACTIONS:
                        </span>
                        {task.recommendedTools.map(tool => (
                          <button
                            type="button"
                            key={tool.id}
                            onClick={() => handleToolClick(tool)}
                            title={tool.tooltip}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${getToolButtonStyle(tool)}`}
                          >
                            {renderToolIcon(tool.icon)}
                            <span className="truncate max-w-[140px] sm:max-w-none">{tool.name}</span>
                            {tool.category === 'external' && <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day 7 Audit & Performance Submission Section */}
            {selectedDayNumber === 7 && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 bg-slate-950 p-3.5 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      Weekly Performance Report & Manager Audit
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Submit and review weekly outcomes for cycle {cycleInfo.displayLabel}
                    </p>
                  </div>

                  <div>
                    {submittedReport ? (
                      <Badge
                        className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-lg"
                      >
                        Submit 7-Day Report
                      </Button>
                    )}
                  </div>
                </div>

                {submittedReport && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                    <div className="text-white">
                      <strong className="text-amber-400">Submission Notes:</strong> {submittedReport.summaryNotes}
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
                  <div className="p-3 bg-slate-900 border border-amber-600/60 rounded-xl space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                      Manager Sign-off Action
                    </span>
                    <textarea
                      rows={2}
                      value={managerFeedback}
                      onChange={e => setManagerFeedback(e.target.value)}
                      placeholder="Enter feedback for the sales rep..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
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
          </Card>
        </div>
      )}

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
