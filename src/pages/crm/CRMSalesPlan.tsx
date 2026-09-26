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
  Info,
  ChevronDown,
  HelpCircle,
  Check
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

// Solid High-Contrast Day Themes (Clean, readable, zero awkward neon shades)
const DAY_THEMES: Record<number, {
  name: string;
  borderColor: string;
  pillActiveBg: string;
  taskBadgeBg: string;
  stepIcon: string;
}> = {
  1: {
    name: 'Day 1: Local Discovery',
    borderColor: 'border-emerald-600',
    pillActiveBg: 'bg-emerald-600 text-white shadow-md',
    taskBadgeBg: 'bg-emerald-700 text-white font-bold',
    stepIcon: '🔍',
  },
  2: {
    name: 'Day 2: Digital & Directories',
    borderColor: 'border-purple-600',
    pillActiveBg: 'bg-purple-600 text-white shadow-md',
    taskBadgeBg: 'bg-purple-700 text-white font-bold',
    stepIcon: '🌐',
  },
  3: {
    name: 'Day 3: Deep Research',
    borderColor: 'border-blue-600',
    pillActiveBg: 'bg-blue-600 text-white shadow-md',
    taskBadgeBg: 'bg-blue-700 text-white font-bold',
    stepIcon: '🎯',
  },
  4: {
    name: 'Day 4: Direct Outreach',
    borderColor: 'border-amber-600',
    pillActiveBg: 'bg-amber-600 text-white shadow-md',
    taskBadgeBg: 'bg-amber-700 text-white font-bold',
    stepIcon: '📞',
  },
  5: {
    name: 'Day 5: Discovery Meetings',
    borderColor: 'border-indigo-600',
    pillActiveBg: 'bg-indigo-600 text-white shadow-md',
    taskBadgeBg: 'bg-indigo-700 text-white font-bold',
    stepIcon: '🤝',
  },
  6: {
    name: 'Day 6: Portfolio & Proposals',
    borderColor: 'border-rose-600',
    pillActiveBg: 'bg-rose-600 text-white shadow-md',
    taskBadgeBg: 'bg-rose-700 text-white font-bold',
    stepIcon: '📄',
  },
  7: {
    name: 'Day 7: Audit & Wrap-Up',
    borderColor: 'border-amber-500',
    pillActiveBg: 'bg-amber-600 text-white shadow-md',
    taskBadgeBg: 'bg-amber-700 text-white font-bold',
    stepIcon: '🏆',
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

  // Active day selection (1 to 7)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(() => {
    return cycleOffsetWeeks === 0 ? cycleInfo.currentDayNumber : 1;
  });

  // Guide accordion toggle for clarity
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
    // If manager is viewing another rep, prevent accidental toggling
    if (isManagerAuditMode && targetUserId !== user.id) {
      toast.info("Manager Audit Mode: You are viewing rep progress. Toggle your own tasks in 'My Daily To-Do'.");
      return;
    }

    const currentVal = !!progressMap[taskId];
    // Optimistic UI update
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
        toast.success("Task completed!");
      }
    } catch {
      // Revert on error
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

  // Active day plan details
  const currentDayPlan = useMemo(() => {
    return SEVEN_DAY_SALES_PLAN.find(d => d.dayNumber === selectedDayNumber) || SEVEN_DAY_SALES_PLAN[0];
  }, [selectedDayNumber]);

  const activeTheme = DAY_THEMES[selectedDayNumber] || DAY_THEMES[1];

  // Render Tool Icon dynamically with crisp white icons
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

  // High contrast solid button styles (Zero awkward neon shades, 100% readable text)
  const getToolButtonStyle = (tool: PlanTool) => {
    if (tool.name.includes('Hot')) {
      return 'bg-red-600 hover:bg-red-700 text-white font-bold border border-red-500 shadow-sm';
    }
    if (tool.name.includes('Warm')) {
      return 'bg-amber-600 hover:bg-amber-700 text-white font-bold border border-amber-500 shadow-sm';
    }
    if (tool.name.includes('Cold')) {
      return 'bg-sky-600 hover:bg-sky-700 text-white font-bold border border-sky-500 shadow-sm';
    }
    if (tool.name.includes('WhatsApp')) {
      return 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-500 shadow-sm';
    }
    if (tool.name.includes('Phone') || tool.name.includes('Call')) {
      return 'bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-500 shadow-sm';
    }
    if (tool.name.includes('CRM') || tool.primary) {
      return 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold border border-indigo-500 shadow-sm';
    }
    return 'bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-600 shadow-sm';
  };

  return (
    <div className="space-y-3 sm:space-y-6 pb-4 sm:pb-16 animate-in fade-in duration-200">
      {/* Solid High-Contrast Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    7-Day Sales To-Do
                  </h1>
                  <Badge className="bg-indigo-600 text-white font-bold text-[10px] sm:text-xs px-2 py-0.5 border-none hidden sm:inline-flex">
                    Repeating Cycle
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                  Actionable weekly sales cadence with direct action tools & database proof
                </p>
              </div>
            </div>

            {/* Quick explanation toggle */}
            <div className="pt-1.5 sm:pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-xl transition"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>How to use this 7-Day Plan?</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Cycle Navigation and Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cycle Week Stepper */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-slate-800 rounded-lg"
                onClick={() => setCycleOffsetWeeks(prev => prev - 1)}
                title="Previous Week Cycle"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-3 text-center">
                <span className="text-xs font-bold text-white block whitespace-nowrap">
                  {cycleInfo.displayLabel}
                </span>
                {cycleInfo.isCurrentCycle ? (
                  <span className="text-[10px] text-emerald-400 font-bold">Active Week</span>
                ) : (
                  <span className="text-[10px] text-slate-400">Past/Future</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-slate-800 rounded-lg"
                onClick={() => setCycleOffsetWeeks(prev => prev + 1)}
                title="Next Week Cycle"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Manager / Admin Audit Toggle */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsManagerAuditMode(false);
                    setTargetUserId(user?.id || '');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    !isManagerAuditMode
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  My To-Do
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManagerAuditMode(true);
                    if (teamMembers.length > 0 && targetUserId === user?.id) {
                      setTargetUserId(teamMembers[0]?.id || user?.id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isManagerAuditMode
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Manager Audit
                </button>
              </div>
            )}

            {/* Sync Database Button */}
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-xl shadow-sm"
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
      </div>

      {/* Collapsible Solid Visual Guide */}
      {showGuide && (
        <Card className="p-3 sm:p-5 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl shadow-md space-y-3 sm:space-y-4 animate-in slide-in-from-top-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm sm:text-base font-black text-white">
                Understanding Your 7-Day Sales Roadmap
              </h3>
            </div>
            <span className="text-xs text-slate-300 font-bold">Simple 7-Step Cadence</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { step: 'Day 1', label: 'Local Search', icon: '🔍', color: 'bg-emerald-900/60 border-emerald-600 text-white' },
              { step: 'Day 2', label: 'B2B Lists', icon: '🌐', color: 'bg-purple-900/60 border-purple-600 text-white' },
              { step: 'Day 3', label: 'Qualify Hot/Warm', icon: '🎯', color: 'bg-blue-900/60 border-blue-600 text-white' },
              { step: 'Day 4', label: 'Calls & WhatsApp', icon: '📞', color: 'bg-amber-900/60 border-amber-600 text-white' },
              { step: 'Day 5', label: 'Demos & Meetings', icon: '🤝', color: 'bg-indigo-900/60 border-indigo-600 text-white' },
              { step: 'Day 6', label: 'Portfolio & Quote', icon: '📄', color: 'bg-rose-900/60 border-rose-600 text-white' },
              { step: 'Day 7', label: 'Report & Manager', icon: '🏆', color: 'bg-slate-800 border-amber-500 text-white' },
            ].map(item => (
              <div key={item.step} className={`p-2.5 rounded-xl border ${item.color} text-center space-y-1`}>
                <div className="text-lg">{item.icon}</div>
                <div className="text-[11px] font-black">{item.step}</div>
                <div className="text-[10px] text-slate-200 font-bold leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Manager Audit Bar (Shown only in manager mode) */}
      {isManagerAuditMode && (
        <Card className="p-4 bg-slate-900 border border-amber-600/60 rounded-2xl animate-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">Auditing Sales Rep:</span>
                <p className="text-[11px] text-slate-300">Select team member to audit checkmarks against DB proof</p>
              </div>
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="ml-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500 shadow-sm"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.username} ({m.designation || m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Manager mode verifies actual database activity against rep checklist checkmarks.</span>
            </div>
          </div>
        </Card>
      )}

      {/* Solid Metric KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-4 w-full max-w-full">
        {/* Weekly Completion Bar */}
        <Card className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Weekly Completion</span>
              <span className="text-xs font-black text-indigo-400">{progressPercent}%</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-white mt-1">
              {completedTasksCount} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">/ {allTasks.length}</span>
            </div>
          </div>
          <div className="w-full bg-slate-950 h-2 sm:h-2.5 rounded-full overflow-hidden mt-2.5 sm:mt-3 border border-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>

        {/* Database Proof: Actual Leads */}
        <Card className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Leads Created</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">{actualMetrics.leadsCreatedCount}</div>
            <span className="text-[9px] sm:text-[11px] text-emerald-400 font-bold block truncate">
              {actualMetrics.hotLeadsCount} 🔥, {actualMetrics.warmLeadsCount} ☀️
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0 ml-1">
            <UserPlus className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>

        {/* Database Proof: Actual Activities */}
        <Card className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Outreach Logged</span>
              <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">{actualMetrics.activitiesCount}</div>
            <span className="text-[9px] sm:text-[11px] text-blue-400 font-bold block truncate">
              {actualMetrics.callsCount} calls, {actualMetrics.whatsAppCount} WA
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0 ml-1">
            <Phone className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>

        {/* Database Proof: Meetings & Progression */}
        <Card className="p-3 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Meetings / Deals</span>
              <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">
              {actualMetrics.meetingsBookedCount} / {actualMetrics.dealsProgressedCount}
            </div>
            <span className="text-[9px] sm:text-[11px] text-purple-400 font-bold block truncate">
              {actualMetrics.meetingsBookedCount} mtgs, {actualMetrics.dealsProgressedCount} won
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0 ml-1">
            <Award className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>
      </div>

      {/* Solid High-Contrast 7-Day Navigation Tabs */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 sm:gap-2.5 w-full max-w-full pb-1 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 custom-scrollbar">
        {SEVEN_DAY_SALES_PLAN.map(day => {
          const isSelected = selectedDayNumber === day.dayNumber;
          const isToday = cycleInfo.isCurrentCycle && cycleInfo.currentDayNumber === day.dayNumber;
          const theme = DAY_THEMES[day.dayNumber] || DAY_THEMES[1];
          const dayTasks = day.tasks;
          const dayCompleted = dayTasks.every(t => progressMap[t.id]);
          const dayDoneCount = dayTasks.filter(t => progressMap[t.id]).length;

          return (
            <button
              type="button"
              key={day.dayNumber}
              onClick={() => setSelectedDayNumber(day.dayNumber)}
              className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between min-w-[140px] sm:min-w-0 snap-center shrink-0 sm:shrink ${
                isSelected
                  ? `${theme.pillActiveBg} ${theme.borderColor} ring-2 ring-white/20`
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{theme.stepIcon}</span>
                  <span className="text-xs font-black uppercase tracking-tight text-white">
                    Day {day.dayNumber}
                  </span>
                </div>
                {isToday && (
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0">
                    Today
                  </Badge>
                )}
              </div>

              <div className="text-[11px] font-bold line-clamp-1 mb-2 text-slate-100">
                {day.title.replace(' (Part 1)', '').replace(' (Part 2)', '')}
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold pt-1.5 border-t border-slate-700/60 text-slate-300">
                <span>{dayDoneCount}/{dayTasks.length} Done</span>
                {dayCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 opacity-50" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Day Detail Card */}
      <Card className={`p-3 sm:p-5 lg:p-8 bg-slate-900 border ${activeTheme.borderColor} rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-xl space-y-3 sm:space-y-5 lg:space-y-6 overflow-hidden w-full max-w-full min-w-0`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className={`${activeTheme.taskBadgeBg} text-xs font-black px-3 py-1 rounded-xl`}>
                {currentDayPlan.badge}
              </Badge>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{activeTheme.stepIcon}</span>
                {currentDayPlan.title}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {currentDayPlan.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Cycle Week: {cycleInfo.displayLabel}</span>
          </div>
        </div>

        {/* Task List with Solid High-Contrast Action Tool Buttons */}
        <div className="space-y-4">
          {currentDayPlan.tasks.map((task, idx) => {
            const isDone = !!progressMap[task.id];

            return (
              <div
                key={task.id}
                className={`p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl border transition-all duration-150 ${
                  isDone
                    ? 'bg-slate-950 border-slate-800 opacity-75'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3.5 sm:gap-4 w-full min-w-0">
                  {/* Checkbox & Task Description */}
                  <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(currentDayPlan.dayNumber, task.id)}
                      className={`mt-0.5 w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-600 hover:border-indigo-400 text-transparent'
                      }`}
                      title={isDone ? "Mark as pending" : "Mark as completed"}
                    >
                      <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                    </button>

                    <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white shadow-sm shrink-0">
                          Task #{idx + 1}
                        </span>
                        <h3 className={`text-base sm:text-lg font-bold break-words ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                          {task.title}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed break-words">
                        {task.objective}
                      </p>
                      {task.targetMetric && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 max-w-full">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{task.targetMetric}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INLINE RECOMMENDED TOOLS (Solid Action Buttons - Wrapping gracefully) */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 xl:pt-0 xl:pl-4 border-t xl:border-t-0 border-slate-800/80 w-full xl:w-auto max-w-full">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider mr-1 hidden xl:inline">
                      ACTION TOOLS:
                    </span>
                    {task.recommendedTools.map(tool => (
                      <button
                        type="button"
                        key={tool.id}
                        onClick={() => handleToolClick(tool)}
                        title={tool.tooltip}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all max-w-full ${getToolButtonStyle(tool)}`}
                      >
                        {renderToolIcon(tool.icon)}
                        <span className="truncate max-w-[180px] sm:max-w-none">{tool.name}</span>
                        {tool.category === 'external' && (
                          <ExternalLink className="w-3 h-3 opacity-80 ml-0.5 shrink-0" />
                        )}
                        {tool.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-white font-black border border-white/20 shrink-0">
                            {tool.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Day 7 Report Audit & Manager Sign-off Section */}
        {selectedDayNumber === 7 && (
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-4 bg-slate-950 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Weekly Performance Submission & Audit Status
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  Manager verification status for cycle {cycleInfo.displayLabel}
                </p>
              </div>

              <div>
                {submittedReport ? (
                  <Badge
                    className={`text-xs font-black px-3 py-1.5 rounded-xl ${
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
                  <Badge variant="outline" className="text-xs font-bold text-slate-300 border-slate-700 bg-slate-800">
                    Not Submitted Yet
                  </Badge>
                )}
              </div>
            </div>

            {submittedReport && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs text-white font-medium">
                  <strong className="text-amber-400">Rep Submission Notes:</strong> {submittedReport.summaryNotes}
                </div>
                {submittedReport.managerFeedback && (
                  <div className="text-xs text-emerald-400 font-medium pt-2 border-t border-slate-800">
                    <strong>Manager Feedback:</strong> {submittedReport.managerFeedback}
                  </div>
                )}
              </div>
            )}

            {/* Manager Sign-off Controls (Visible to Admin in Manager Audit Mode) */}
            {isManagerAuditMode && isAdmin && (
              <div className="p-4 bg-slate-900 border border-amber-600/60 rounded-2xl space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                  Manager Sign-off & Audit Action
                </span>
                <textarea
                  rows={2}
                  value={managerFeedback}
                  onChange={e => setManagerFeedback(e.target.value)}
                  placeholder="Enter manager feedback, observations on actual CRM calls/leads, or guidance for next cycle..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none shadow-inner"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewingReport}
                    onClick={() => handleManagerReview('Needs Improvement')}
                    className="text-xs bg-red-950 text-red-300 border-red-800 hover:bg-red-900 font-bold rounded-xl"
                  >
                    Flag Needs Improvement
                  </Button>
                  <Button
                    size="sm"
                    disabled={reviewingReport}
                    onClick={() => handleManagerReview('Approved')}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                  >
                    {reviewingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Approve 7-Day Performance
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

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
