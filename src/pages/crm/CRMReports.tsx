import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCRMData } from "@/contexts/CRMDataContext";
import { useAuth } from "@/hooks/useAuth";
import { 
  ShieldAlert, Users, Download, Calendar, 
  Trophy, ExternalLink,
  Printer, CheckCircle2, MessageSquare, TrendingUp,
  IndianRupee, Target, Clock, Briefcase,
  BarChart3, Wallet, Star, ArrowUpRight, ArrowDownRight,
  Globe, UserCheck, Zap, ChevronDown, ChevronUp
} from "lucide-react";

export default function CRMReports() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const crmData = useCRMData();
  
  const loading = (crmData?.loading ?? false) || authLoading;
  // Reports always use allLeads/allActivities/allTasks (full workspace data)
  // so the per-rep filter dropdown in Reports works independently of the Team/Mine toggle.
  const rawLeads = crmData?.allLeads || crmData?.leads || [];
  const rawActivities = crmData?.allActivities || crmData?.activities || [];
  const rawTasks = crmData?.allTasks || crmData?.tasks || [];
  const teamMembers = crmData?.teamMembers || [];

  // Filter States
  const [selectedSalesRep, setSelectedSalesRep] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"pipeline" | "performance" | "activity" | "leads" | "revenue">("pipeline");

  // Mobile Accordion Section States (Default All Minimized)
  const [openMobileSections, setOpenMobileSections] = useState<Record<string, boolean>>({
    pipeline: false,
    performance: false,
    activity: false,
    leads: false,
    revenue: false,
  });

  // Collapsible Lead Source Breakdown State (Default Minimized)
  const [isLeadSourceOpen, setIsLeadSourceOpen] = useState<boolean>(false);

  const toggleMobileSection = (sectionKey: string) => {
    setOpenMobileSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Date filtering logic
  const dateCutoff = useMemo(() => {
    const now = new Date();
    if (timeframe === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === "30days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    } else if (timeframe === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), qMonth, 1);
    } else if (timeframe === "year") {
      return new Date(now.getFullYear(), 0, 1);
    }
    return null;
  }, [timeframe]);

  // Apply Timeframe Filter to raw data
  const leads = useMemo(() => {
    if (!dateCutoff) return rawLeads;
    return rawLeads.filter(l => new Date(l.created_at) >= dateCutoff);
  }, [rawLeads, dateCutoff]);

  const activities = useMemo(() => {
    if (!dateCutoff) return rawActivities;
    return rawActivities.filter(a => new Date(a.created_at) >= dateCutoff);
  }, [rawActivities, dateCutoff]);

  const tasks = useMemo(() => {
    if (!dateCutoff) return rawTasks;
    return rawTasks.filter(t => new Date(t.created_at || t.due_date) >= dateCutoff);
  }, [rawTasks, dateCutoff]);

  // Extract unique Sales Persons from teamMembers AND leads/activities/tasks based on CRM protocol
  const salesPersons = useMemo(() => {
    const map = new Map<string, { id: string; name: string; username: string; designation?: string }>();
    
    teamMembers.forEach(m => {
      const designationLower = (m.designation || '').toLowerCase();
      const roleLower = (m.role || '').toLowerCase();
      const usernameLower = (m.username || '').toLowerCase();

      if (['admin', 'oomadmin'].includes(usernameLower) && m.id !== user?.id) return;

      const isAuthorizedCRMUser = 
        roleLower === 'admin' ||
        designationLower.includes('marketing') ||
        designationLower.includes('business') ||
        designationLower.includes('sales') ||
        designationLower.includes('growth') ||
        designationLower.includes('crm') ||
        designationLower.includes('strategy') ||
        designationLower.includes('bd');

      if (isAuthorizedCRMUser) {
        map.set(m.id, {
          id: m.id,
          name: m.full_name || m.username || 'Sales Rep',
          username: m.username || '',
          designation: m.designation || 'Marketing / Sales'
        });
      }
    });

    leads.forEach(l => {
      if (l.assigned_to && l.assigned_user) {
        if (!map.has(l.assigned_to)) {
          map.set(l.assigned_to, {
            id: l.assigned_to,
            name: l.assigned_user.full_name || l.assigned_user.username || 'Sales Rep',
            username: l.assigned_user.username || '',
            designation: 'Sales Representative'
          });
        }
      }
    });

    return Array.from(map.values());
  }, [teamMembers, leads, user?.id]);

  // Filter Data by selected Sales Person if specific rep selected
  const filteredLeads = useMemo(() => {
    if (selectedSalesRep === "all") return leads;
    if (selectedSalesRep === "unassigned") return leads.filter(l => !l.assigned_to);
    return leads.filter(l => l.assigned_to === selectedSalesRep);
  }, [leads, selectedSalesRep]);

  const filteredActivities = useMemo(() => {
    if (selectedSalesRep === "all") return activities;
    if (selectedSalesRep === "unassigned") return activities.filter(a => !a.user_id && !a.crm_leads?.assigned_to);
    return activities.filter(a => a.user_id === selectedSalesRep || a.crm_leads?.assigned_to === selectedSalesRep);
  }, [activities, selectedSalesRep]);

  const filteredTasks = useMemo(() => {
    if (selectedSalesRep === "all") return tasks;
    if (selectedSalesRep === "unassigned") return tasks.filter(t => !t.assigned_to && !t.created_by);
    return tasks.filter(t => t.assigned_to === selectedSalesRep || t.created_by === selectedSalesRep);
  }, [tasks, selectedSalesRep]);

  // ═══════════════════════════════════════════════════════════════
  // CORE METRICS
  // ═══════════════════════════════════════════════════════════════
  const wonLeads = filteredLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status));
  const lostLeads = filteredLeads.filter(l => l.status === 'Lost');
  const activeLeads = filteredLeads.filter(l => !['Lost', 'Not Interested', 'Completed'].includes(l.status));
  const conversionRate = filteredLeads.length > 0 ? (wonLeads.length / filteredLeads.length * 100).toFixed(1) : "0.0";
  const avgDealSize = wonLeads.length > 0 ? (wonLeads.reduce((s,l) => s+(Number(l.estimated_value)||0), 0) / wonLeads.length) : 0;
  const wonRevenue = wonLeads.reduce((s,l) => s+(Number(l.estimated_value)||0), 0);
  const totalPipelineValue = filteredLeads.filter(l => !['Lost', 'Not Interested'].includes(l.status)).reduce((s,l) => s+(Number(l.estimated_value)||0), 0);
  const lostValue = lostLeads.reduce((s,l) => s+(Number(l.estimated_value)||0), 0);

  // Self-scheduled Task discipline
  const completedTasksCount = filteredTasks.filter(t => t.status === 'Completed').length;
  const taskCompletionRate = filteredTasks.length > 0 ? ((completedTasksCount / filteredTasks.length) * 100).toFixed(0) : "0";

  // ═══════════════════════════════════════════════════════════════
  // NEW METRICS: Lead Source Breakdown
  // ═══════════════════════════════════════════════════════════════
  const leadSourceData = useMemo(() => {
    const sourceMap = new Map<string, { count: number; value: number; won: number }>();
    filteredLeads.forEach(l => {
      const src = l.source || 'Unknown';
      const existing = sourceMap.get(src) || { count: 0, value: 0, won: 0 };
      existing.count++;
      existing.value += Number(l.estimated_value) || 0;
      if (['Won (Converted)', 'Completed'].includes(l.status)) existing.won++;
      sourceMap.set(src, existing);
    });
    return Array.from(sourceMap.entries())
      .map(([name, data]) => ({ name, ...data, convRate: data.count > 0 ? ((data.won / data.count) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  // ═══════════════════════════════════════════════════════════════
  // NEW METRICS: Payment Status Summary
  // ═══════════════════════════════════════════════════════════════
  const paymentSummary = useMemo(() => {
    const paid = { count: 0, value: 0 };
    const partial = { count: 0, value: 0, collected: 0 };
    const pending = { count: 0, value: 0 };

    filteredLeads.forEach(l => {
      const ps = (l.payment_status || 'Pending').toLowerCase();
      const estVal = Number(l.estimated_value) || 0;
      const amtPaid = Number(l.amount_paid) || 0;

      if (ps === 'paid' || ps === 'completed') {
        paid.count++;
        paid.value += estVal;
      } else if (ps === 'partial') {
        partial.count++;
        partial.value += estVal;
        partial.collected += amtPaid;
      } else {
        pending.count++;
        pending.value += estVal;
      }
    });

    const totalCollected = paid.value + partial.collected;
    const totalOutstanding = partial.value - partial.collected + pending.value;

    return { paid, partial, pending, totalCollected, totalOutstanding };
  }, [filteredLeads]);

  // ═══════════════════════════════════════════════════════════════
  // NEW METRICS: Top Revenue Leads
  // ═══════════════════════════════════════════════════════════════
  const topRevenueLeads = useMemo(() => {
    return [...wonLeads]
      .sort((a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0))
      .slice(0, 5);
  }, [wonLeads]);

  // ═══════════════════════════════════════════════════════════════
  // NEW METRICS: Average Response Time (first activity after lead creation)
  // ═══════════════════════════════════════════════════════════════
  const avgResponseTime = useMemo(() => {
    let totalHours = 0;
    let count = 0;
    filteredLeads.forEach(l => {
      const leadActivities = activities.filter(a => a.lead_id === l.id || a.crm_leads?.company_name === l.company_name);
      if (leadActivities.length > 0) {
        const sortedActs = [...leadActivities].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const firstActivityTime = new Date(sortedActs[0].created_at).getTime();
        const leadCreatedTime = new Date(l.created_at).getTime();
        const diffHours = (firstActivityTime - leadCreatedTime) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          totalHours += diffHours;
          count++;
        }
      }
    });
    return count > 0 ? totalHours / count : 0;
  }, [filteredLeads, activities]);

  const formatResponseTime = (hours: number) => {
    if (hours === 0) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  // ═══════════════════════════════════════════════════════════════
  // EFFORT & ENGAGEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════
  // Calculate Effort & Engagement Score (0-100)
  const calcEffortScore = (notesCount: number, tasksCompleted: number, tasksTotal: number, convRateStr: string, wonLeadsCount: number) => {
    const convRate = parseFloat(convRateStr) || 0;
    // 1. Log Notes & Communication Effort (max 40 pts: 5 pts per note up to 40)
    const actScore = Math.min(40, notesCount * 5);
    // 2. Follow-up Discipline (max 35 pts)
    const taskRatio = tasksTotal > 0 ? (tasksCompleted / tasksTotal) : 0;
    const taskScore = Math.round(taskRatio * 35);
    // 3. Conversion Success (max 25 pts)
    const convScore = Math.min(25, Math.round((convRate * 0.25) + (wonLeadsCount * 4)));
    return Math.min(100, actScore + taskScore + convScore);
  };

  const getEffortRating = (score: number) => {
    if (score >= 75) return { label: '🔥 High Performer', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
    if (score >= 45) return { label: '⚡ Active Contributor', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };
    return { label: '⚠️ Needs Engagement', color: 'bg-rose-500/10 text-rose-500 border-rose-500/30' };
  };

  // ═══════════════════════════════════════════════════════════════
  // PER-SALESPERSON LEADERBOARD
  // ═══════════════════════════════════════════════════════════════
  const leaderboardData = useMemo(() => {
    const list = salesPersons.map(sp => {
      const spLeads = leads.filter(l => l.assigned_to === sp.id);
      const spWonLeads = spLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status));
      const spLostLeads = spLeads.filter(l => l.status === 'Lost');
      const spWonValue = spWonLeads.reduce((s,l) => s + (Number(l.estimated_value) || 0), 0);
      const spPipelineVal = spLeads.filter(l => !['Lost', 'Not Interested'].includes(l.status)).reduce((s,l) => s + (Number(l.estimated_value) || 0), 0);
      const spConvRate = spLeads.length > 0 ? ((spWonLeads.length / spLeads.length) * 100).toFixed(1) : "0.0";
      
      const spActivities = activities.filter(a => a.user_id === sp.id || a.crm_leads?.assigned_to === sp.id);
      const spTasks = tasks.filter(t => t.assigned_to === sp.id || t.created_by === sp.id);
      const spCompletedTasks = spTasks.filter(t => t.status === 'Completed').length;

      // Payment metrics per rep
      const spCollected = spLeads.reduce((s, l) => s + (Number(l.amount_paid) || 0), 0);
      const spTotalValue = spLeads.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);

      const effortScore = calcEffortScore(spActivities.length, spCompletedTasks, spTasks.length, spConvRate, spWonLeads.length);
      const effortRating = getEffortRating(effortScore);

      return {
        ...sp,
        totalLeads: spLeads.length,
        wonLeads: spWonLeads.length,
        lostLeads: spLostLeads.length,
        wonValue: spWonValue,
        pipelineValue: spPipelineVal,
        conversionRate: spConvRate,
        notesCount: spActivities.length,
        tasksTotal: spTasks.length,
        tasksCompleted: spCompletedTasks,
        taskCompletionRate: spTasks.length > 0 ? Math.round((spCompletedTasks / spTasks.length) * 100) : 0,
        effortScore,
        effortRating,
        collected: spCollected,
        totalValue: spTotalValue,
        outstanding: spTotalValue - spCollected,
      };
    });

    const unassignedLeadsList = leads.filter(l => !l.assigned_to);
    if (unassignedLeadsList.length > 0) {
      const unassignedWon = unassignedLeadsList.filter(l => ['Won (Converted)', 'Completed'].includes(l.status));
      const unassignedLost = unassignedLeadsList.filter(l => l.status === 'Lost');
      const unassignedWonVal = unassignedWon.reduce((s,l) => s + (Number(l.estimated_value) || 0), 0);
      const unassignedPipeVal = unassignedLeadsList.filter(l => !['Lost', 'Not Interested'].includes(l.status)).reduce((s,l) => s + (Number(l.estimated_value) || 0), 0);
      const unassignedConv = unassignedLeadsList.length > 0 ? ((unassignedWon.length / unassignedLeadsList.length) * 100).toFixed(1) : "0.0";
      
      const unassignedAct = activities.filter(a => !a.user_id && !a.crm_leads?.assigned_to);
      const unassignedTsk = tasks.filter(t => !t.assigned_to && !t.created_by);
      const unassignedCompTsk = unassignedTsk.filter(t => t.status === 'Completed').length;
      const unassignedEffort = calcEffortScore(unassignedAct.length, unassignedCompTsk, unassignedTsk.length, unassignedConv, unassignedWon.length);

      const uCollected = unassignedLeadsList.reduce((s, l) => s + (Number(l.amount_paid) || 0), 0);
      const uTotalValue = unassignedLeadsList.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);

      list.push({
        id: 'unassigned',
        name: 'Unassigned Leads Portfolio',
        username: 'unassigned',
        designation: 'Unassigned Leads',
        totalLeads: unassignedLeadsList.length,
        wonLeads: unassignedWon.length,
        lostLeads: unassignedLost.length,
        wonValue: unassignedWonVal,
        pipelineValue: unassignedPipeVal,
        conversionRate: unassignedConv,
        notesCount: unassignedAct.length,
        tasksTotal: unassignedTsk.length,
        tasksCompleted: unassignedCompTsk,
        taskCompletionRate: unassignedTsk.length > 0 ? Math.round((unassignedCompTsk / unassignedTsk.length) * 100) : 0,
        effortScore: unassignedEffort,
        effortRating: getEffortRating(unassignedEffort),
        collected: uCollected,
        totalValue: uTotalValue,
        outstanding: uTotalValue - uCollected,
      });
    }

    return list.sort((a, b) => b.effortScore - a.effortScore || b.wonValue - a.wonValue);
  }, [salesPersons, leads, activities, tasks]);

  // Display Leaderboard Data filtered by selected sales rep
  const displayLeaderboardData = useMemo(() => {
    if (selectedSalesRep === "all") return leaderboardData;
    return leaderboardData.filter(r => r.id === selectedSalesRep);
  }, [leaderboardData, selectedSalesRep]);

  const selectedRepLeaderboardItem = useMemo(() => {
    if (selectedSalesRep === "all") return null;
    return leaderboardData.find(r => r.id === selectedSalesRep) || null;
  }, [leaderboardData, selectedSalesRep]);

  // ═══════════════════════════════════════════════════════════════
  // CHART DATA
  // ═══════════════════════════════════════════════════════════════
  // Stage Data for Bar Chart
  const stageData = [
    { stage: "New Leads", value: filteredLeads.filter(l => l.status === 'New Leads').reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
    { stage: "Contacted", value: filteredLeads.filter(l => l.status === 'Contacted').reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
    { stage: "Interested", value: filteredLeads.filter(l => l.status === 'Interested').reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
    { stage: "Proposal", value: filteredLeads.filter(l => l.status === 'Proposal Sent').reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
    { stage: "Negotiation", value: filteredLeads.filter(l => l.status === 'Negotiation').reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
    { stage: "Won", value: filteredLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status)).reduce((s,l) => s+(Number(l.estimated_value)||0), 0) },
  ];

  // Source breakdown pie chart data
  const SOURCE_COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6', '#6366F1'];

  // Currency Formatter for Chart YAxis
  const formatCurrencyShort = (val: number) => {
    if (!val) return "₹0";
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  // Salesperson Revenue Chart Data - Filters to selected rep if specific rep chosen
  const repRevenueChartData = useMemo(() => {
    return displayLeaderboardData.slice(0, 8).map(rep => ({
      name: rep.name.split(' ')[0] || rep.username,
      won: rep.wonValue,
      pipeline: rep.pipelineValue
    }));
  }, [displayLeaderboardData]);

  // ═══════════════════════════════════════════════════════════════
  // CSV EXPORT (Enhanced with new columns)
  // ═══════════════════════════════════════════════════════════════
  const exportToCSV = () => {
    const sanitize = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      const cleanStr = ['=', '+', '-', '@'].includes(s.charAt(0)) ? `'${s}` : s;
      return `"${cleanStr}"`;
    };

    const headers = [
      "Sales Rep", "Username", "Designation", "Work Effort Index (0-100)", "Performance Rating",
      "Total Leads", "Won Deals", "Lost Deals", "Won Revenue (INR)", "Pipeline Value (INR)",
      "Conversion Rate (%)", "Log Notes Count", "Completed Tasks",
      "Revenue Collected (INR)", "Outstanding Amount (INR)"
    ];
    const rows = displayLeaderboardData.map(r => [
      sanitize(r.name),
      sanitize(r.username),
      sanitize(r.designation),
      r.effortScore,
      sanitize(r.effortRating.label),
      r.totalLeads,
      r.wonLeads,
      r.lostLeads,
      r.wonValue,
      r.pipelineValue,
      r.conversionRate,
      r.notesCount,
      sanitize(`${r.tasksCompleted}/${r.tasksTotal}`),
      r.collected,
      r.outstanding
    ]);

    const csvString = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const scrollToTop = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handler for switching tabs with automatic top-scroll reset
  const handleTabChange = (tab: "pipeline" | "performance" | "activity" | "leads" | "revenue") => {
    setActiveTab(tab);
    scrollToTop();
  };

  // Handler for selecting a Sales Rep -> switches to pipeline & scrolls up to show scorecard
  const handleSelectRepScorecard = (repId: string) => {
    setSelectedSalesRep(repId);
    setActiveTab("pipeline");
    setOpenMobileSections(prev => ({ ...prev, pipeline: true, performance: true }));
    scrollToTop();
  };

  // Handler for navigating to a specific Lead in CRM Leads page
  const handleViewLead = (companyName?: string) => {
    if (!companyName || !companyName.trim()) {
      navigate('/crm/leads');
      return;
    }
    navigate(`/crm/leads?search=${encodeURIComponent(companyName.trim())}`);
  };

  // Handler for navigating to a Sales Rep's leads in CRM Leads page
  const handleViewRepLeads = (repId?: string, repName?: string) => {
    if (repId === 'unassigned' || !repName || repName === 'Unassigned Leads Portfolio') {
      navigate('/crm/leads?search=unassigned');
      return;
    }
    navigate(`/crm/leads?search=${encodeURIComponent(repName.trim())}`);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER GUARDS
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading workspace analytics...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <ShieldAlert className="h-16 w-16 text-rose-500 opacity-80" />
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">You do not have permission to view workspace financial reports. This area is restricted to administrators.</p>
      </div>
    );
  }

  const currentRepObj = salesPersons.find(sp => sp.id === selectedSalesRep);
  const teamAvgEffort = leaderboardData.length > 0 ? Math.round(leaderboardData.reduce((s, r) => s + r.effortScore, 0) / leaderboardData.length) : 0;

  // ═══════════════════════════════════════════════════════════════
  // TAB DEFINITIONS
  // ═══════════════════════════════════════════════════════════════
  const tabs = [
    { key: "pipeline" as const, label: "Pipeline & Revenue", icon: BarChart3, count: null },
    { key: "performance" as const, label: "Sales Performance", icon: Trophy, count: salesPersons.length },
    { key: "activity" as const, label: "Activity Stream", icon: MessageSquare, count: filteredActivities.length },
    { key: "leads" as const, label: "Leads Portfolio", icon: Users, count: filteredLeads.length },
    { key: "revenue" as const, label: "Revenue Tracker", icon: Wallet, count: null },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full pb-12 overflow-x-hidden sm:overflow-x-visible">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER & FILTER CONTROLS                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card border border-border p-3.5 sm:p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Reports</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">Admin</Badge>
              </div>
              <p className="text-muted-foreground text-xs hidden sm:block">Pipeline analytics and performance tracking for sales representatives.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Sales Person Filter - Clean Dropdown showing ONLY names */}
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-2 text-xs shadow-xs flex-1 min-w-[140px] sm:flex-initial">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <select 
                value={selectedSalesRep} 
                onChange={(e) => {
                  setSelectedSalesRep(e.target.value);
                  scrollToTop();
                }}
                className="bg-transparent text-foreground font-bold border-none focus:outline-none cursor-pointer w-full text-xs truncate"
              >
                <option value="all" className="bg-card text-foreground py-1">All Sales Reps</option>
                <option value="unassigned" className="bg-card text-foreground py-1">Unassigned Leads</option>
                {salesPersons.map(sp => (
                  <option key={sp.id} value={sp.id} className="bg-card text-foreground py-1">{sp.name}</option>
                ))}
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-3 py-2 text-xs shadow-xs flex-1 min-w-[120px] sm:flex-initial">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <select 
                value={timeframe} 
                onChange={(e) => {
                  setTimeframe(e.target.value);
                  scrollToTop();
                }}
                className="bg-transparent text-foreground font-bold border-none focus:outline-none cursor-pointer w-full text-xs"
              >
                <option value="all" className="bg-card text-foreground py-1">All Time</option>
                <option value="month" className="bg-card text-foreground py-1">This Month</option>
                <option value="30days" className="bg-card text-foreground py-1">Last 30 Days</option>
                <option value="quarter" className="bg-card text-foreground py-1">This Quarter</option>
                <option value="year" className="bg-card text-foreground py-1">This Year</option>
              </select>
            </div>

            {/* Export & Print Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-1.5 border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl font-bold">
                <Download className="w-3.5 h-3.5 text-primary" />
                CSV
              </Button>

              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 border-border text-foreground hover:bg-muted text-xs h-9 px-3 rounded-xl font-bold">
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Scope Banner */}
        {selectedSalesRep !== "all" && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                {currentRepObj?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-foreground truncate">{currentRepObj ? currentRepObj.name : "Unassigned Leads"}</span>
                {currentRepObj?.username && <span className="text-muted-foreground hidden sm:inline text-[11px]">@{currentRepObj.username}</span>}
              </div>
              {selectedRepLeaderboardItem && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${selectedRepLeaderboardItem.effortRating.color}`}>
                  Work Effort: {selectedRepLeaderboardItem.effortScore}/100 ({selectedRepLeaderboardItem.effortRating.label})
                </Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedSalesRep("all")} className="text-[11px] text-primary hover:bg-primary/10 font-bold h-6 px-2 shrink-0">
              Show All Reps ✕
            </Button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* UNIFIED 6-KPI SCORECARDS (Always Visible)                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* KPI 1: Total Leads */}
        <Card className="p-3 sm:p-4 bg-card border-border group hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Leads</span>
            <Target className="w-4 h-4 text-blue-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground transition-all duration-500">{filteredLeads.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{activeLeads.length} active in pipeline</div>
        </Card>

        {/* KPI 2: Won Revenue */}
        <Card className="p-3 sm:p-4 bg-card border-border group hover:border-emerald-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Won Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-500 transition-all duration-500">₹{wonRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            {wonLeads.length} deals closed
          </div>
        </Card>

        {/* KPI 3: Conversion Rate */}
        <Card className="p-3 sm:p-4 bg-card border-border group hover:border-violet-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Conversion</span>
            <TrendingUp className="w-4 h-4 text-violet-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground transition-all duration-500">{conversionRate}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{wonLeads.length} won / {filteredLeads.length} total</div>
        </Card>

        {/* KPI 4: Avg Deal Size */}
        <Card className="p-3 sm:p-4 bg-card border-border group hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Deal</span>
            <Briefcase className="w-4 h-4 text-amber-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground transition-all duration-500">₹{avgDealSize.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Based on won deals</div>
        </Card>

        {/* KPI 5: Lost Deals */}
        <Card className="p-3 sm:p-4 bg-card border-border group hover:border-rose-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lost Deals</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-500 transition-all duration-500">{lostLeads.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total ₹{lostValue.toLocaleString()}</div>
        </Card>

        {/* KPI 6: Work Effort Index */}
        <Card 
          className="p-3 sm:p-4 bg-card border-border group hover:border-emerald-500/40 transition-all duration-300 cursor-pointer"
          onClick={() => handleTabChange("performance")}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Effort Index</span>
            <Zap className="w-4 h-4 text-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground transition-all duration-500 flex items-center gap-1.5">
            {teamAvgEffort}/100
          </div>
          <div className="text-[10px] mt-0.5">
            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${getEffortRating(teamAvgEffort).color}`}>
              {getEffortRating(teamAvgEffort).label}
            </Badge>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* NAVIGATION TABS - Desktop Only                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="hidden sm:block sticky top-0 z-30 bg-background/95 backdrop-blur-xl py-2 border-b border-border/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 shrink-0 flex items-center gap-2 touch-manipulation active:scale-95 ${
                activeTab === tab.key 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
                  : "bg-card/80 border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DESKTOP TAB CONTENT & MOBILE ACCORDIONS                    */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* 💻 DESKTOP TABBED VIEW */}
      <div className="hidden sm:block space-y-4">
        {/* TAB 1: PIPELINE & REVENUE ANALYTICS */}
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            {/* Pipeline Value Chart */}
            <Card className="p-3.5 sm:p-5 bg-card border-border overflow-hidden">
              <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3">Pipeline Value by Stage</h2>
              <div className="w-full h-[260px]" style={{ touchAction: 'pan-y' }}>
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="stage" stroke="#CBD5E1" style={{ fontSize: "10px" }} angle={-35} textAnchor="end" height={50} interval={0} />
                    <YAxis stroke="#CBD5E1" tickFormatter={formatCurrencyShort} style={{ fontSize: "10px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", fontSize: "12px" }} formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Pipeline Value']} />
                    <Bar dataKey="value" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Revenue Won by Sales Rep Chart */}
            <Card className="p-3.5 sm:p-5 bg-card border-border overflow-hidden">
              <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Revenue Won by Sales Representative
              </h2>
              {repRevenueChartData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs">
                  No sales representative data recorded yet.
                </div>
              ) : (
                <div className="w-full h-[220px]" style={{ touchAction: 'pan-y' }}>
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <BarChart data={repRevenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#CBD5E1" style={{ fontSize: "10px" }} />
                      <YAxis stroke="#CBD5E1" tickFormatter={formatCurrencyShort} style={{ fontSize: "10px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", fontSize: "12px" }} formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Won Revenue']} />
                      <Bar dataKey="won" fill="#10B981" name="Won Revenue (₹)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Lead Source Breakdown (Minimizable Stage) */}
            <Card className="p-3.5 sm:p-5 bg-card border-border">
              <button
                type="button"
                onClick={() => setIsLeadSourceOpen(!isLeadSourceOpen)}
                className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
              >
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-500" />
                  Lead Source Breakdown
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-cyan-500 border-cyan-500/30">
                    {leadSourceData.length} Sources
                  </Badge>
                  {isLeadSourceOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isLeadSourceOpen && (
                <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in-50 duration-200">
                  {leadSourceData.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-xs">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No lead source data available.</p>
                      <p className="text-[10px] mt-1">Tag leads with a source (Google, Referral, etc.) for insights here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Source Pie Chart */}
                      <div className="w-full h-[200px]" style={{ touchAction: 'pan-y' }}>
                        <ResponsiveContainer width="100%" height={200} minWidth={0}>
                          <PieChart>
                            <Pie 
                              data={leadSourceData} 
                              dataKey="count" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={70} 
                              innerRadius={35}
                              paddingAngle={3}
                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              labelLine={false}
                              style={{ fontSize: '9px' }}
                            >
                              {leadSourceData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", fontSize: "11px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Source Table */}
                      <div className="space-y-2">
                        {leadSourceData.map((src, i) => (
                          <div key={src.name} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg border border-border/50 text-xs hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                              <span className="font-medium text-foreground">{src.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                              <span className="font-bold text-foreground">{src.count} leads</span>
                              <span>₹{src.value.toLocaleString()}</span>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                parseFloat(src.convRate) >= 30 ? 'text-emerald-500 border-emerald-500/30' :
                                parseFloat(src.convRate) > 0 ? 'text-amber-500 border-amber-500/30' :
                                'text-muted-foreground border-border'
                              }`}>
                                {src.convRate}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Payment Status Summary */}
            <Card className="p-3.5 sm:p-5 bg-card border-border">
              <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                Payment Status Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Paid / Completed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-lg font-bold text-emerald-500">{paymentSummary.paid.count} deals</div>
                  <div className="text-[11px] text-muted-foreground">₹{paymentSummary.paid.value.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Partial Payment</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-lg font-bold text-amber-500">{paymentSummary.partial.count} deals</div>
                  <div className="text-[11px] text-muted-foreground">Collected ₹{paymentSummary.partial.collected.toLocaleString()} / ₹{paymentSummary.partial.value.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">Pending</span>
                    <IndianRupee className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-lg font-bold text-rose-500">{paymentSummary.pending.count} deals</div>
                  <div className="text-[11px] text-muted-foreground">₹{paymentSummary.pending.value.toLocaleString()}</div>
                </div>
              </div>
            </Card>

            {/* Pipeline Summary + Stage Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-card border-border">
                <h3 className="font-semibold text-foreground text-sm mb-3">Pipeline Summary</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Pipeline Value</span>
                    <span className="font-semibold text-foreground">₹{totalPipelineValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Leads</span>
                    <span className="font-semibold text-foreground">{activeLeads.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Won Deals</span>
                    <span className="font-semibold text-green-500">₹{wonRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lost Deals</span>
                    <span className="font-semibold text-red-500">₹{lostValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Response Time</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-500" />
                      {formatResponseTime(avgResponseTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Task Completion</span>
                    <span className="font-semibold text-foreground">{taskCompletionRate}% ({completedTasksCount}/{filteredTasks.length})</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border-border">
                <h3 className="font-semibold text-foreground text-sm mb-3">Stage Distribution</h3>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: "New Leads", value: filteredLeads.filter(l => l.status === 'New Leads').length, color: "bg-blue-500" },
                    { label: "Contacted", value: filteredLeads.filter(l => l.status === 'Contacted').length, color: "bg-cyan-500" },
                    { label: "Interested", value: filteredLeads.filter(l => l.status === 'Interested').length, color: "bg-amber-500" },
                    { label: "Proposal/Quotation", value: filteredLeads.filter(l => l.status === 'Proposal Sent').length, color: "bg-purple-500" },
                    { label: "Negotiation", value: filteredLeads.filter(l => l.status === 'Negotiation').length, color: "bg-cyan-500" },
                    { label: "Won", value: filteredLeads.filter(l => ['Won (Converted)', 'Completed'].includes(l.status)).length, color: "bg-green-500" },
                    { label: "Onboarding", value: filteredLeads.filter(l => l.status === 'Onboarding').length, color: "bg-indigo-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 2: SALES REP PERFORMANCE MATRIX                      */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "performance" && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Sales Representative Performance Matrix</h2>
                <p className="text-xs text-muted-foreground">Click any sales representative row or card to open their complete performance scorecard.</p>
              </div>
            </div>

            {/* Desktop & Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Sales Representative</th>
                    <th className="py-2.5 px-3">Work Effort Score</th>
                    <th className="py-2.5 px-3">Total Leads</th>
                    <th className="py-2.5 px-3">Won Deals</th>
                    <th className="py-2.5 px-3">Won Revenue (₹)</th>
                    <th className="py-2.5 px-3">Pipeline Value (₹)</th>
                    <th className="py-2.5 px-3">Conversion Rate</th>
                    <th className="py-2.5 px-3">Log Notes</th>
                    <th className="py-2.5 px-3">Follow-ups Done</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayLeaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-muted-foreground">
                        No sales representatives found in workspace matching filter.
                      </td>
                    </tr>
                  ) : (
                    displayLeaderboardData.map((rep, idx) => (
                      <tr 
                        key={rep.id} 
                        className={`hover:bg-primary/10 transition-colors cursor-pointer ${selectedSalesRep === rep.id ? 'bg-primary/15 font-semibold' : ''}`}
                        onClick={() => handleSelectRepScorecard(rep.id)}
                      >
                        <td className="py-2.5 px-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-xs">{rep.name}</div>
                              <div className="text-[10px] text-muted-foreground">@{rep.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-foreground">{rep.effortScore}/100</span>
                              <Badge variant="outline" className={`text-[9px] py-0 px-1 ${rep.effortRating.color}`}>{rep.effortRating.label}</Badge>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-700 ${rep.effortScore >= 75 ? 'bg-emerald-500' : rep.effortScore >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${rep.effortScore}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">{rep.totalLeads}</td>
                        <td className="py-2.5 px-3">
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">{rep.wonLeads} Won</Badge>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-500">₹{rep.wonValue.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">₹{rep.pipelineValue.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-bold text-foreground">{rep.conversionRate}%</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-medium text-purple-400">
                            <MessageSquare className="w-3 h-3" />
                            {rep.notesCount}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 font-medium text-cyan-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {rep.tasksCompleted}/{rep.tasksTotal} ({rep.taskCompletionRate}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRepScorecard(rep.id);
                              }}
                              className="text-[11px] text-primary hover:bg-primary/20 h-7 px-2 font-bold"
                            >
                              Scorecard
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewRepLeads(rep.id, rep.name);
                              }}
                              className="text-[11px] text-foreground hover:bg-muted h-7 px-2 border-border"
                            >
                              View Leads →
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Aspect Card View for Sales Rep Leaderboard */}
            <div className="sm:hidden space-y-3">
              {displayLeaderboardData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs bg-muted/10 rounded-2xl border border-dashed border-border">
                  <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="font-semibold">No sales representatives found matching filter.</p>
                </div>
              ) : (
                displayLeaderboardData.map((rep, idx) => (
                  <div 
                    key={rep.id} 
                    className={`p-3.5 bg-card border rounded-2xl space-y-3 shadow-xs transition-all active:scale-[0.99] touch-manipulation cursor-pointer ${
                      selectedSalesRep === rep.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'
                    }`}
                    onClick={() => handleSelectRepScorecard(rep.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{rep.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">@{rep.username}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 shrink-0 ${rep.effortRating.color}`}>
                        {rep.effortRating.label}
                      </Badge>
                    </div>

                    {/* Progress Bar & Work Effort */}
                    <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Effort Score</span>
                        <span className="font-black text-foreground">{rep.effortScore}/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 rounded-full ${rep.effortScore >= 75 ? 'bg-emerald-500' : rep.effortScore >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${rep.effortScore}%` }} 
                        />
                      </div>
                    </div>

                    {/* 2x2 Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase">Won Revenue</div>
                        <div className="font-black text-emerald-600 text-sm">₹{rep.wonValue.toLocaleString()}</div>
                        <div className="text-[9px] text-muted-foreground">{rep.wonLeads} deals won</div>
                      </div>
                      <div className="p-2 bg-background border border-border/60 rounded-xl">
                        <div className="text-[9px] text-muted-foreground font-bold uppercase">Pipeline Value</div>
                        <div className="font-bold text-foreground text-sm">₹{rep.pipelineValue.toLocaleString()}</div>
                        <div className="text-[9px] text-muted-foreground">{rep.totalLeads} total leads</div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-purple-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {rep.notesCount} logs
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {rep.tasksCompleted}/{rep.tasksTotal}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRepScorecard(rep.id);
                          }}
                          className="text-[11px] text-primary hover:bg-primary/20 h-7 px-2 font-bold"
                        >
                          Scorecard
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRepLeads(rep.id, rep.name);
                          }}
                          className="text-[11px] text-foreground hover:bg-muted h-7 px-2.5 border-border font-bold rounded-lg"
                        >
                          Leads →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 3: ACTIVITY & COMMUNICATION STREAM                   */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "activity" && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Sales Communication & Log Notes Stream</h2>
                <p className="text-xs text-muted-foreground">Click any note to navigate directly to the lead in CRM.</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                {filteredActivities.length} logs
              </Badge>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
                <p className="text-sm font-medium">No log notes recorded yet.</p>
                <p className="text-xs mt-1 text-muted-foreground">When sales reps log calls, meetings, or notes, they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((act) => {
                  const matchedSalesPerson = salesPersons.find(sp => sp.id === act.user_id);
                  const leadName = act.crm_leads?.company_name || 'CRM Lead';
                  const contactPerson = act.crm_leads?.contact_person || '';
                  const loggedByName = matchedSalesPerson?.name || act.user?.full_name || act.user?.username || 'Salesperson';

                  return (
                    <div 
                      key={act.id} 
                      className="p-3 bg-muted/20 border border-border rounded-xl hover:border-primary/50 transition-all duration-200 cursor-pointer"
                      onClick={() => handleViewLead(act.crm_leads?.company_name)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="p-1 rounded bg-primary/10 text-primary font-bold text-[10px]">
                            {act.description?.includes('📞') ? '📞 CALL' : act.description?.includes('🤝') ? '🤝 MEETING' : '📝 LOG NOTE'}
                          </span>
                          <h4 className="font-semibold text-foreground text-xs flex items-center gap-1">
                            {leadName} <ExternalLink className="w-3 h-3 text-primary" />
                          </h4>
                          {contactPerson && <span className="text-[11px] text-muted-foreground">({contactPerson})</span>}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            By: {loggedByName}
                          </span>
                          <span>•</span>
                          <span>{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-xs text-foreground/90 bg-background/50 p-2.5 rounded-lg border border-border/50 whitespace-pre-line">
                        {act.description || 'No discussion details logged.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 4: LEADS PORTFOLIO TABLE & MOBILE CARDS               */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "leads" && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Assigned Leads Portfolio</h2>
                <p className="text-xs text-muted-foreground">Click any lead to view or edit details in the CRM Leads workspace.</p>
              </div>
              <Badge className="bg-primary/20 text-primary border-none text-[10px]">{filteredLeads.length} Leads</Badge>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3">Contact Person</th>
                    <th className="py-2.5 px-3">Stage Status</th>
                    <th className="py-2.5 px-3">Est. Value (₹)</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Assigned Rep</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-muted-foreground">
                        No leads match the selected sales representative or timeframe.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => handleViewLead(lead.company_name)}
                      >
                        <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-1.5">
                          {lead.company_name}
                          <ExternalLink className="w-3 h-3 text-primary opacity-80" />
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{lead.contact_person}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className={`text-[10px] ${
                            lead.status === 'Won (Converted)' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                            lead.status === 'Lost' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                            'bg-primary/10 text-primary border-primary/30'
                          }`}>
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-foreground">₹{(lead.estimated_value || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {lead.source || <span className="text-muted-foreground/50 italic">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className={`text-[9px] ${
                            (lead.payment_status || '').toLowerCase() === 'paid' || (lead.payment_status || '').toLowerCase() === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : (lead.payment_status || '').toLowerCase() === 'partial'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {lead.payment_status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {lead.assigned_user?.full_name || lead.assigned_user?.username || 'Unassigned'}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewLead(lead.company_name);
                            }}
                            className="text-[11px] text-primary hover:bg-primary/20 h-7 px-2 font-bold"
                          >
                            Open Lead →
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Aspect Cards */}
            <div className="sm:hidden space-y-2">
              {filteredLeads.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No leads match the selected sales representative or timeframe.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-2.5 bg-muted/20 border border-border rounded-xl space-y-1.5 hover:border-primary transition-all duration-200 cursor-pointer"
                    onClick={() => handleViewLead(lead.company_name)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-foreground text-xs truncate flex items-center gap-1">
                        {lead.company_name} <ExternalLink className="w-3 h-3 text-primary" />
                      </h4>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${
                        lead.status === 'Won (Converted)' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                        lead.status === 'Lost' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                        'bg-primary/10 text-primary border-primary/30'
                      }`}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Contact: {lead.contact_person || 'N/A'}</span>
                      <span className="font-bold text-foreground text-xs">₹{(lead.estimated_value || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {lead.source && <span className="text-cyan-500">{lead.source}</span>}
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                          (lead.payment_status || '').toLowerCase() === 'paid' ? 'text-emerald-500 border-emerald-500/30' :
                          (lead.payment_status || '').toLowerCase() === 'partial' ? 'text-amber-500 border-amber-500/30' :
                          'text-muted-foreground border-border'
                        }`}>
                          {lead.payment_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Assigned: {lead.assigned_user?.full_name || lead.assigned_user?.username || 'Unassigned'}</span>
                      <span className="font-bold text-primary">Open Lead →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 5: REVENUE & PAYMENT TRACKER [NEW]                   */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "revenue" && (
          <div className="space-y-4">
            {/* Revenue Collected vs Pending */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Revenue Collected</h3>
                    <p className="text-[10px] text-muted-foreground">Total payments received</p>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-500 transition-all duration-500">
                  ₹{paymentSummary.totalCollected.toLocaleString()}
                </div>
                <div className="mt-2 w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${(paymentSummary.totalCollected + paymentSummary.totalOutstanding) > 0 ? (paymentSummary.totalCollected / (paymentSummary.totalCollected + paymentSummary.totalOutstanding) * 100) : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {(paymentSummary.totalCollected + paymentSummary.totalOutstanding) > 0 
                    ? `${((paymentSummary.totalCollected / (paymentSummary.totalCollected + paymentSummary.totalOutstanding)) * 100).toFixed(0)}% of total value collected`
                    : 'No revenue data'
                  }
                </div>
              </Card>

              <Card className="p-4 bg-card border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Outstanding Amount</h3>
                    <p className="text-[10px] text-muted-foreground">Pending collection</p>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-rose-500 transition-all duration-500">
                  ₹{paymentSummary.totalOutstanding.toLocaleString()}
                </div>
                <div className="mt-2 w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-700"
                    style={{ width: `${(paymentSummary.totalCollected + paymentSummary.totalOutstanding) > 0 ? (paymentSummary.totalOutstanding / (paymentSummary.totalCollected + paymentSummary.totalOutstanding) * 100) : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {paymentSummary.partial.count} partial + {paymentSummary.pending.count} pending deals
                </div>
              </Card>
            </div>

            {/* Payment Breakdown by Rep */}
            <Card className="p-4 bg-card border-border">
              <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-500" />
                Payment Collection by Sales Representative
              </h2>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto custom-scrollbar border border-border rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Sales Representative</th>
                      <th className="py-2.5 px-3">Total Deal Value (₹)</th>
                      <th className="py-2.5 px-3">Collected (₹)</th>
                      <th className="py-2.5 px-3">Outstanding (₹)</th>
                      <th className="py-2.5 px-3">Collection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayLeaderboardData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No sales representative data available.
                        </td>
                      </tr>
                    ) : (
                      displayLeaderboardData.map((rep) => {
                        const collectionRate = rep.totalValue > 0 ? ((rep.collected / rep.totalValue) * 100).toFixed(0) : '0';
                        return (
                          <tr key={rep.id} className="hover:bg-primary/10 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-foreground">{rep.name}</td>
                            <td className="py-2.5 px-3 font-medium text-foreground">₹{rep.totalValue.toLocaleString()}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-500">₹{rep.collected.toLocaleString()}</td>
                            <td className="py-2.5 px-3 font-medium text-rose-500">₹{rep.outstanding.toLocaleString()}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      parseInt(collectionRate) >= 70 ? 'bg-emerald-500' : 
                                      parseInt(collectionRate) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${collectionRate}%` }}
                                  />
                                </div>
                                <span className="font-bold text-foreground text-[11px]">{collectionRate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {displayLeaderboardData.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No payment data available.</p>
                  </div>
                ) : (
                  displayLeaderboardData.map((rep) => {
                    const collectionRate = rep.totalValue > 0 ? ((rep.collected / rep.totalValue) * 100).toFixed(0) : '0';
                    return (
                      <div key={rep.id} className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs">{rep.name}</span>
                          <span className="font-bold text-foreground text-xs">{collectionRate}%</span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              parseInt(collectionRate) >= 70 ? 'bg-emerald-500' : 
                              parseInt(collectionRate) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${collectionRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Collected: <span className="text-emerald-500 font-bold">₹{rep.collected.toLocaleString()}</span></span>
                          <span>Pending: <span className="text-rose-500 font-bold">₹{rep.outstanding.toLocaleString()}</span></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Top Revenue Leads */}
            <Card className="p-4 bg-card border-border">
              <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Top Revenue Deals (Won)
              </h2>
              
              {topRevenueLeads.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No won deals yet.</p>
                  <p className="text-[10px] mt-1">Closed deals will appear here ranked by revenue.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topRevenueLeads.map((lead, idx) => (
                    <div 
                      key={lead.id} 
                      className="flex items-center gap-3 p-2.5 bg-muted/20 border border-border rounded-xl hover:border-amber-500/40 transition-all duration-200 cursor-pointer"
                      onClick={() => handleViewLead(lead.company_name)}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-500' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-400' :
                        idx === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-xs truncate flex items-center gap-1">
                          {lead.company_name} <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {lead.contact_person || 'N/A'} • {lead.assigned_user?.full_name || 'Unassigned'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-500 text-sm">₹{(lead.estimated_value || 0).toLocaleString()}</div>
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 ${
                          (lead.payment_status || '').toLowerCase() === 'paid' ? 'text-emerald-500 border-emerald-500/30' :
                          (lead.payment_status || '').toLowerCase() === 'partial' ? 'text-amber-500 border-amber-500/30' :
                          'text-muted-foreground border-border'
                        }`}>
                          {lead.payment_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* 📱 MOBILE ACCORDION & COLLAPSIBLE SECTIONS VIEW */}
      <div className="sm:hidden space-y-3">
        {/* Accordion 1: Pipeline & Revenue Analytics */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => toggleMobileSection('pipeline')}
            className="w-full p-4 flex items-center justify-between bg-muted/20 text-left font-bold text-sm text-foreground active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-black text-sm">Pipeline & Revenue</span>
                <span className="text-[10px] text-muted-foreground font-normal">Stage totals & lead sources</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px]">
                ₹{totalPipelineValue.toLocaleString()}
              </Badge>
              {openMobileSections.pipeline ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {openMobileSections.pipeline && (
            <div className="p-3 border-t border-border/60 space-y-4 animate-in fade-in-50 duration-200">
              {/* Pipeline Value Chart */}
              <Card className="p-3.5 bg-card border-border overflow-hidden">
                <h2 className="text-xs font-bold text-foreground mb-3">Pipeline Value by Stage</h2>
                <div className="w-full h-[220px]" style={{ touchAction: 'pan-y' }}>
                  <ResponsiveContainer width="100%" height={220} minWidth={0}>
                    <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="stage" stroke="#CBD5E1" style={{ fontSize: "9px" }} angle={-35} textAnchor="end" height={45} interval={0} />
                      <YAxis stroke="#CBD5E1" tickFormatter={formatCurrencyShort} style={{ fontSize: "9px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", fontSize: "11px" }} formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Pipeline Value']} />
                      <Bar dataKey="value" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Lead Source Breakdown (Minimizable Stage) */}
              <Card className="p-3.5 bg-card border-border">
                <button
                  type="button"
                  onClick={() => setIsLeadSourceOpen(!isLeadSourceOpen)}
                  className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <h2 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-500" />
                    Lead Source Breakdown
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-bold text-cyan-500 border-cyan-500/30">
                      {leadSourceData.length} Sources
                    </Badge>
                    {isLeadSourceOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isLeadSourceOpen && (
                  <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in-50 duration-200">
                    {leadSourceData.length === 0 ? (
                      <div className="py-4 text-center text-muted-foreground text-xs">
                        <p>No lead source data available.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leadSourceData.map((src, i) => (
                          <div key={src.name} className="flex items-center justify-between p-2 bg-muted/20 rounded-xl border border-border/50 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                              <span className="font-bold text-foreground">{src.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                              <span className="font-bold text-foreground">{src.count} leads</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0">{src.convRate}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Payment Summary Cards */}
              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-emerald-500 font-bold uppercase">Paid / Completed</div>
                    <div className="text-base font-black text-emerald-500">{paymentSummary.paid.count} deals</div>
                  </div>
                  <div className="text-right text-xs font-bold text-emerald-500">₹{paymentSummary.paid.value.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-amber-500 font-bold uppercase">Partial Payment</div>
                    <div className="text-base font-black text-amber-500">{paymentSummary.partial.count} deals</div>
                  </div>
                  <div className="text-right text-xs font-bold text-amber-500">Collected ₹{paymentSummary.partial.collected.toLocaleString()}</div>
                </div>

                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rose-500 font-bold uppercase">Pending Payment</div>
                    <div className="text-base font-black text-rose-500">{paymentSummary.pending.count} deals</div>
                  </div>
                  <div className="text-right text-xs font-bold text-rose-500">₹{paymentSummary.pending.value.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Sales Representative Performance Matrix */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => toggleMobileSection('performance')}
            className="w-full p-4 flex items-center justify-between bg-muted/20 text-left font-bold text-sm text-foreground active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-black text-sm">Sales Performance Matrix</span>
                <span className="text-[10px] text-muted-foreground font-normal">Work effort & rep leaderboard</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                {salesPersons.length} Reps
              </Badge>
              {openMobileSections.performance ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {openMobileSections.performance && (
            <div className="p-3 border-t border-border/60 space-y-3 animate-in fade-in-50 duration-200">
              {displayLeaderboardData.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <p>No sales representatives found.</p>
                </div>
              ) : (
                displayLeaderboardData.map((rep, idx) => (
                  <div 
                    key={rep.id} 
                    className={`p-3.5 bg-card border rounded-2xl space-y-3 shadow-xs active:scale-[0.99] touch-manipulation cursor-pointer ${
                      selectedSalesRep === rep.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border'
                    }`}
                    onClick={() => handleSelectRepScorecard(rep.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 border border-primary/20">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm truncate">{rep.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">@{rep.username}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 shrink-0 ${rep.effortRating.color}`}>
                        {rep.effortRating.label}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Effort Score</span>
                        <span className="font-black text-foreground">{rep.effortScore}/100</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 rounded-full ${rep.effortScore >= 75 ? 'bg-emerald-500' : rep.effortScore >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${rep.effortScore}%` }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <div className="text-[9px] text-emerald-600 font-bold uppercase">Won Revenue</div>
                        <div className="font-black text-emerald-600 text-sm">₹{rep.wonValue.toLocaleString()}</div>
                        <div className="text-[9px] text-muted-foreground">{rep.wonLeads} deals won</div>
                      </div>
                      <div className="p-2 bg-background border border-border/60 rounded-xl">
                        <div className="text-[9px] text-muted-foreground font-bold uppercase">Pipeline Value</div>
                        <div className="font-bold text-foreground text-sm">₹{rep.pipelineValue.toLocaleString()}</div>
                        <div className="text-[9px] text-muted-foreground">{rep.totalLeads} total leads</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                        <span className="inline-flex items-center gap-1 font-bold text-purple-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {rep.notesCount} logs
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-cyan-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {rep.tasksCompleted}/{rep.tasksTotal}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRepScorecard(rep.id);
                          }}
                          className="text-[11px] text-primary hover:bg-primary/20 h-7 px-2 font-bold"
                        >
                          Scorecard
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRepLeads(rep.id, rep.name);
                          }}
                          className="text-[11px] text-foreground hover:bg-muted h-7 px-2.5 border-border font-bold rounded-lg"
                        >
                          Leads →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Accordion 3: Activity & Communication Stream */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => toggleMobileSection('activity')}
            className="w-full p-4 flex items-center justify-between bg-muted/20 text-left font-bold text-sm text-foreground active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-black text-sm">Activity Stream</span>
                <span className="text-[10px] text-muted-foreground font-normal">Call logs & notes feed</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-[10px]">
                {filteredActivities.length} Logs
              </Badge>
              {openMobileSections.activity ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {openMobileSections.activity && (
            <div className="p-3 border-t border-border/60 space-y-2.5 animate-in fade-in-50 duration-200">
              {filteredActivities.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <p>No activity logs recorded yet.</p>
                </div>
              ) : (
                filteredActivities.slice(0, 15).map((act) => (
                  <div 
                    key={act.id} 
                    className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5 cursor-pointer active:bg-muted/40"
                    onClick={() => handleViewLead(act.crm_leads?.company_name)}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1 truncate">
                        {act.crm_leads?.company_name || 'CRM Lead'} <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(act.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-foreground/90 line-clamp-2 bg-background/40 p-2 rounded-lg border border-border/40">
                      {act.description || 'No discussion details logged.'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Accordion 4: Assigned Leads Portfolio */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => toggleMobileSection('leads')}
            className="w-full p-4 flex items-center justify-between bg-muted/20 text-left font-bold text-sm text-foreground active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-black text-sm">Leads Portfolio</span>
                <span className="text-[10px] text-muted-foreground font-normal">Assigned leads summary</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">
                {filteredLeads.length} Leads
              </Badge>
              {openMobileSections.leads ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {openMobileSections.leads && (
            <div className="p-3 border-t border-border/60 space-y-2 animate-in fade-in-50 duration-200">
              {filteredLeads.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs">
                  <p>No leads match selected filter.</p>
                </div>
              ) : (
                filteredLeads.slice(0, 15).map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5 cursor-pointer active:bg-muted/40"
                    onClick={() => handleViewLead(lead.company_name)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-xs truncate flex items-center gap-1">
                        {lead.company_name} <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                      </span>
                      <Badge variant="outline" className="text-[9px] shrink-0">{lead.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-muted-foreground">{lead.contact_person || 'N/A'}</span>
                      <span className="font-black text-emerald-500">₹{(lead.estimated_value || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Accordion 5: Revenue & Payment Tracker */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => toggleMobileSection('revenue')}
            className="w-full p-4 flex items-center justify-between bg-muted/20 text-left font-bold text-sm text-foreground active:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-black text-sm">Revenue & Payment Tracker</span>
                <span className="text-[10px] text-muted-foreground font-normal">Collected vs outstanding</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                ₹{paymentSummary.totalCollected.toLocaleString()}
              </Badge>
              {openMobileSections.revenue ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {openMobileSections.revenue && (
            <div className="p-3 border-t border-border/60 space-y-3 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="text-[9px] font-bold text-emerald-600 uppercase">Collected</div>
                  <div className="text-base font-black text-emerald-600">₹{paymentSummary.totalCollected.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                  <div className="text-[9px] font-bold text-rose-500 uppercase">Outstanding</div>
                  <div className="text-base font-black text-rose-500">₹{paymentSummary.totalOutstanding.toLocaleString()}</div>
                </div>
              </div>

              {/* Top Revenue Deals */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">Top Won Revenue Deals</h4>
                {topRevenueLeads.map((lead, idx) => (
                  <div key={lead.id} className="flex items-center justify-between p-2.5 bg-muted/20 border border-border rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-amber-500 text-xs">#{idx + 1}</span>
                      <span className="font-bold text-foreground truncate">{lead.company_name}</span>
                    </div>
                    <span className="font-black text-emerald-500 shrink-0">₹{(lead.estimated_value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
