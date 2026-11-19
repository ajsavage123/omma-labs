import { supabase } from '@/lib/supabase';

export interface PlanTool {
  id: string;
  name: string;
  category: 'external' | 'crm_action' | 'resource';
  icon: string;
  url?: string;
  actionKey?: string;
  badge?: string;
  tooltip?: string;
  primary?: boolean;
}

export interface PlanTask {
  id: string;
  dayNumber: number;
  title: string;
  objective: string;
  targetMetric?: string;
  recommendedTools: PlanTool[];
}

export interface DayPlan {
  dayNumber: number;
  title: string;
  subtitle: string;
  badge: string;
  tasks: PlanTask[];
}

export interface CycleInfo {
  cycleStartDate: string; // YYYY-MM-DD
  cycleEndDate: string;   // YYYY-MM-DD
  currentDayNumber: number; // 1-7
  isCurrentCycle: boolean;
  displayLabel: string;
}

export interface ActualCrmMetrics {
  leadsCreatedCount: number;
  hotLeadsCount: number;
  warmLeadsCount: number;
  coldLeadsCount: number;
  activitiesCount: number;
  callsCount: number;
  whatsAppCount: number;
  emailsCount: number;
  meetingsBookedCount: number;
  dealsProgressedCount: number;
}

export interface WeeklyReportData {
  id?: string;
  cycleStartDate: string;
  cycleEndDate: string;
  userId: string;
  workspaceId: string;
  leadsCreatedCount: number;
  activitiesLoggedCount: number;
  meetingsBookedCount: number;
  dealsProgressedCount: number;
  summaryNotes: string;
  managerStatus: 'Pending Review' | 'Approved' | 'Needs Improvement';
  managerFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
}

// Master 7-Day Sales Plan Task Structure
export const SEVEN_DAY_SALES_PLAN: DayPlan[] = [
  {
    dayNumber: 1,
    title: "Lead Generation (Part 1)",
    subtitle: "Local Discovery & Business Directories",
    badge: "Day 1 - Prospecting",
    tasks: [
      {
        id: "d1-t1",
        dayNumber: 1,
        title: "Discover Local & Regional Target Businesses",
        objective: "Identify 10+ potential business accounts in target sectors (IT, Healthcare, Retail, Manufacturing, Services) using search maps and directories.",
        targetMetric: "Target: ≥10 accounts identified",
        recommendedTools: [
          {
            id: "tool-gmaps",
            name: "Google Maps",
            category: "external",
            icon: "map-pin",
            url: "https://www.google.com/maps/search/businesses+near+me",
            tooltip: "Search local commercial establishments and get phone/address directly",
            primary: true
          },
          {
            id: "tool-gsearch",
            name: "Google Search",
            category: "external",
            icon: "search",
            url: "https://www.google.com/search?q=top+businesses+and+companies",
            tooltip: "Search company domains, reviews, and industry directories"
          },
          {
            id: "tool-justdial",
            name: "Justdial",
            category: "external",
            icon: "phone-forwarded",
            url: "https://www.justdial.com",
            tooltip: "Browse verified B2B vendor listings and contact numbers"
          },
          {
            id: "tool-sulekha",
            name: "Sulekha",
            category: "external",
            icon: "building",
            url: "https://www.sulekha.com",
            tooltip: "Find service providers and SMB decision makers"
          },
          {
            id: "act-quick-lead",
            name: "+ Add to CRM",
            category: "crm_action",
            icon: "user-plus",
            actionKey: "quick_add_lead",
            badge: "CRM",
            tooltip: "Save newly found prospect directly into CRM Leads",
            primary: true
          }
        ]
      },
      {
        id: "d1-t2",
        dayNumber: 1,
        title: "Extract Contact Details & Log Leads into CRM",
        objective: "Capture company names, primary contact persons, phone numbers, and location details into your CRM.",
        targetMetric: "Target: Log ≥10 leads in CRM",
        recommendedTools: [
          {
            id: "tool-justdial-2",
            name: "Justdial B2B",
            category: "external",
            icon: "phone-forwarded",
            url: "https://www.justdial.com"
          },
          {
            id: "tool-sulekha-2",
            name: "Sulekha B2B",
            category: "external",
            icon: "building",
            url: "https://www.sulekha.com"
          },
          {
            id: "act-open-leads",
            name: "Leads Directory",
            category: "crm_action",
            icon: "users",
            actionKey: "open_leads_directory",
            badge: "CRM",
            tooltip: "Review your newly captured leads in the CRM registry"
          }
        ]
      }
    ]
  },
  {
    dayNumber: 2,
    title: "Lead Generation (Part 2)",
    subtitle: "Directory Expansion & Aggregation",
    badge: "Day 2 - Scaling Leads",
    tasks: [
      {
        id: "d2-t1",
        dayNumber: 2,
        title: "Broaden Search Keywords & Sector Filters",
        objective: "Expand search to secondary sectors (E-commerce, Real Estate, Education) using targeted directory keywords.",
        targetMetric: "Target: ≥10 additional prospects",
        recommendedTools: [
          {
            id: "tool-gsearch-2",
            name: "Google Search",
            category: "external",
            icon: "search",
            url: "https://www.google.com/search?q=top+companies+in+hyderabad+bangalore",
            primary: true
          },
          {
            id: "tool-gmaps-2",
            name: "Google Maps",
            category: "external",
            icon: "map-pin",
            url: "https://www.google.com/maps/search/corporate+offices"
          },
          {
            id: "tool-justdial-3",
            name: "Justdial",
            category: "external",
            icon: "phone-forwarded",
            url: "https://www.justdial.com"
          },
          {
            id: "tool-sulekha-3",
            name: "Sulekha",
            category: "external",
            icon: "building",
            url: "https://www.sulekha.com"
          }
        ]
      },
      {
        id: "d2-t2",
        dayNumber: 2,
        title: "Cleanse & Bulk Validate Prospects into CRM",
        objective: "Verify phone number connectivity, remove duplicates, and ensure every prospect has an active CRM profile.",
        targetMetric: "Target: 20 total active leads in CRM",
        recommendedTools: [
          {
            id: "act-add-lead-d2",
            name: "+ Quick Add Lead",
            category: "crm_action",
            icon: "user-plus",
            actionKey: "quick_add_lead",
            badge: "CRM",
            primary: true
          },
          {
            id: "act-csv-import",
            name: "Import CSV",
            category: "crm_action",
            icon: "file-spreadsheet",
            actionKey: "open_csv_import",
            badge: "CRM",
            tooltip: "Bulk import leads from CSV into CRM"
          }
        ]
      }
    ]
  },
  {
    dayNumber: 3,
    title: "Research & Qualification",
    subtitle: "Website, LinkedIn, Apollo & Temperature Rating",
    badge: "Day 3 - Qualification",
    tasks: [
      {
        id: "d3-t1",
        dayNumber: 3,
        title: "Deep-Dive Company Background & Digital Presence",
        objective: "Inspect website speed, existing tech stack, design quality, and potential business bottlenecks.",
        targetMetric: "Target: Inspect 15+ company portals",
        recommendedTools: [
          {
            id: "tool-website-search",
            name: "Company Website",
            category: "external",
            icon: "globe",
            url: "https://www.google.com",
            tooltip: "Check client website design, responsive behavior, and tech gaps",
            primary: true
          },
          {
            id: "tool-linkedin-company",
            name: "LinkedIn Company",
            category: "external",
            icon: "linkedin",
            url: "https://www.linkedin.com/search/results/companies/",
            tooltip: "Inspect company size, headcount growth, and industry sector",
            primary: true
          },
          {
            id: "tool-apollo",
            name: "Apollo.io",
            category: "external",
            icon: "zap",
            url: "https://app.apollo.io",
            tooltip: "Get verified corporate email addresses and company intelligence",
            primary: true
          }
        ]
      },
      {
        id: "d3-t2",
        dayNumber: 3,
        title: "Identify CXOs & Decision Makers",
        objective: "Find Founders, Managing Directors, CTOs, and Marketing Heads with verified direct contact details.",
        targetMetric: "Target: ≥10 verified decision-maker contacts",
        recommendedTools: [
          {
            id: "tool-linkedin-people",
            name: "LinkedIn People",
            category: "external",
            icon: "linkedin",
            url: "https://www.linkedin.com/search/results/people/?keywords=Founder+CEO+Director",
            primary: true
          },
          {
            id: "tool-apollo-people",
            name: "Apollo Contacts",
            category: "external",
            icon: "zap",
            url: "https://app.apollo.io",
            primary: true
          }
        ]
      },
      {
        id: "d3-t3",
        dayNumber: 3,
        title: "Classify Lead Temperature in CRM (Hot, Warm, Cold)",
        objective: "Segment leads into Hot 🔥 (High budget/urgent fit), Warm ☀️ (Interest / needs nurture), or Cold ❄️ (Low current fit).",
        targetMetric: "Target: 100% of newly added leads classified",
        recommendedTools: [
          {
            id: "act-classify-hot",
            name: "Classify Hot 🔥",
            category: "crm_action",
            icon: "flame",
            actionKey: "classify_lead_hot",
            badge: "Hot",
            tooltip: "Set lead temperature as Hot (High priority & immediate outreach)",
            primary: true
          },
          {
            id: "act-classify-warm",
            name: "Classify Warm ☀️",
            category: "crm_action",
            icon: "sun",
            actionKey: "classify_lead_warm",
            badge: "Warm",
            tooltip: "Set lead temperature as Warm (Promising fit with follow-up need)"
          },
          {
            id: "act-classify-cold",
            name: "Classify Cold ❄️",
            category: "crm_action",
            icon: "snowflake",
            actionKey: "classify_lead_cold",
            badge: "Cold",
            tooltip: "Set lead temperature as Cold (Low priority / long-term nurture)"
          }
        ]
      }
    ]
  },
  {
    dayNumber: 4,
    title: "Multi-Channel Outreach",
    subtitle: "Phone, WhatsApp, Gmail, LinkedIn & Outcome Logging",
    badge: "Day 4 - First Contact",
    tasks: [
      {
        id: "d4-t1",
        dayNumber: 4,
        title: "Direct Phone Calls to High-Priority Prospects",
        objective: "Make initial voice calls to Hot and Warm leads. Record call outcome in CRM immediately.",
        targetMetric: "Target: ≥15 calls made and logged",
        recommendedTools: [
          {
            id: "tool-phone",
            name: "Phone / Dialer",
            category: "external",
            icon: "phone",
            url: "tel:",
            tooltip: "Trigger phone dialer on desktop or mobile",
            primary: true
          },
          {
            id: "act-log-call",
            name: "Log Call in CRM",
            category: "crm_action",
            icon: "file-text",
            actionKey: "log_activity_call",
            badge: "CRM",
            tooltip: "Record call outcome (Connected, Voicemail, Gatekeeper, Callback) into CRM",
            primary: true
          }
        ]
      },
      {
        id: "d4-t2",
        dayNumber: 4,
        title: "Personalized WhatsApp Business Intro Messages",
        objective: "Send warm, professional WhatsApp messages introducing OomaLabs solutions and asking for a short chat.",
        targetMetric: "Target: ≥10 WhatsApp touches logged",
        recommendedTools: [
          {
            id: "tool-whatsapp",
            name: "WhatsApp Business",
            category: "external",
            icon: "message-circle",
            url: "https://web.whatsapp.com",
            tooltip: "Open WhatsApp Web or app with pre-filled message template",
            primary: true
          },
          {
            id: "act-log-whatsapp",
            name: "Log WhatsApp in CRM",
            category: "crm_action",
            icon: "file-text",
            actionKey: "log_activity_whatsapp",
            badge: "CRM",
            tooltip: "Record WhatsApp outreach status in CRM"
          }
        ]
      },
      {
        id: "d4-t3",
        dayNumber: 4,
        title: "Executive Intro Email via Gmail",
        objective: "Dispatch tailored value-proposition emails to CXO email addresses.",
        targetMetric: "Target: ≥10 emails sent and logged",
        recommendedTools: [
          {
            id: "tool-gmail",
            name: "Gmail",
            category: "external",
            icon: "mail",
            url: "https://mail.google.com",
            tooltip: "Compose outreach email in Gmail",
            primary: true
          },
          {
            id: "act-log-email",
            name: "Log Email in CRM",
            category: "crm_action",
            icon: "file-text",
            actionKey: "log_activity_email",
            badge: "CRM",
            tooltip: "Record email outreach in CRM activity timeline"
          }
        ]
      },
      {
        id: "d4-t4",
        dayNumber: 4,
        title: "LinkedIn InMail & Connection Requests",
        objective: "Send personalized connection requests with notes highlighting mutual synergy.",
        targetMetric: "Target: ≥8 connections sent",
        recommendedTools: [
          {
            id: "tool-linkedin-outreach",
            name: "LinkedIn",
            category: "external",
            icon: "linkedin",
            url: "https://www.linkedin.com/messaging/",
            primary: true
          },
          {
            id: "act-log-linkedin",
            name: "Log Note in CRM",
            category: "crm_action",
            icon: "file-text",
            actionKey: "log_activity_note",
            badge: "CRM"
          }
        ]
      }
    ]
  },
  {
    dayNumber: 5,
    title: "Continue Outreach & Meeting Setup",
    subtitle: "Response Handling, Google Meet & Zoom Scheduling",
    badge: "Day 5 - Meeting Conversion",
    tasks: [
      {
        id: "d5-t1",
        dayNumber: 5,
        title: "Follow-Up on Unopened Messages & Inbound Replies",
        objective: "Address prospect questions, answer pricing queries, and provide clarity to turn interest into demos.",
        targetMetric: "Target: 100% response rate within 2 hours",
        recommendedTools: [
          {
            id: "tool-whatsapp-d5",
            name: "WhatsApp Business",
            category: "external",
            icon: "message-circle",
            url: "https://web.whatsapp.com",
            primary: true
          },
          {
            id: "tool-gmail-d5",
            name: "Gmail",
            category: "external",
            icon: "mail",
            url: "https://mail.google.com"
          },
          {
            id: "act-log-outcome-d5",
            name: "Record Outcome",
            category: "crm_action",
            icon: "file-text",
            actionKey: "log_activity_note",
            badge: "CRM"
          }
        ]
      },
      {
        id: "d5-t2",
        dayNumber: 5,
        title: "Schedule Discovery Meetings on Google Meet or Zoom",
        objective: "Book discovery / tech demo calls with qualified prospects and attach meeting link to CRM task.",
        targetMetric: "Target: ≥2 meetings booked in CRM",
        recommendedTools: [
          {
            id: "tool-gmeet",
            name: "Google Meet",
            category: "external",
            icon: "video",
            url: "https://meet.google.com/new",
            tooltip: "Create an instant Google Meet room link",
            primary: true
          },
          {
            id: "tool-zoom",
            name: "Zoom",
            category: "external",
            icon: "video",
            url: "https://zoom.us/start",
            tooltip: "Create or start a Zoom meeting"
          },
          {
            id: "act-crm-meeting",
            name: "Schedule Meeting in CRM",
            category: "crm_action",
            icon: "calendar-plus",
            actionKey: "schedule_crm_meeting",
            badge: "CRM",
            tooltip: "Creates a Meeting task in CRM Tasks and Workspace Calendar",
            primary: true
          },
          {
            id: "act-crm-calendar",
            name: "CRM Calendar",
            category: "crm_action",
            icon: "calendar",
            actionKey: "open_crm_calendar",
            badge: "CRM"
          }
        ]
      }
    ]
  },
  {
    dayNumber: 6,
    title: "Follow-Up & Portfolio Showcase",
    subtitle: "Share OomaLabs Portfolio, Clarify Specs & Advance Pipeline",
    badge: "Day 6 - Pipeline Progression",
    tasks: [
      {
        id: "d6-t1",
        dayNumber: 6,
        title: "Share OomaLabs Portfolio & Case Studies",
        objective: "Send live client project demonstrations, UI showcase, and credential decks to warm prospects.",
        targetMetric: "Target: Portfolio shared with all active prospects",
        recommendedTools: [
          {
            id: "act-share-portfolio",
            name: "OomaLabs Portfolio",
            category: "crm_action",
            icon: "briefcase",
            actionKey: "share_oomalabs_portfolio",
            badge: "Showcase",
            tooltip: "Preview and 1-click share OomaLabs live portfolio & credentials",
            primary: true
          },
          {
            id: "tool-whatsapp-share",
            name: "Share via WhatsApp",
            category: "external",
            icon: "message-circle",
            url: "https://web.whatsapp.com",
            primary: true
          },
          {
            id: "tool-gmail-share",
            name: "Email Credentials",
            category: "external",
            icon: "mail",
            url: "https://mail.google.com"
          }
        ]
      },
      {
        id: "d6-t2",
        dayNumber: 6,
        title: "Clarify Technical & Scope Requirements",
        objective: "Capture project requirements, budget bracket, timeline expectations, and feature wishlists.",
        targetMetric: "Target: ≥2 scoping briefs documented",
        recommendedTools: [
          {
            id: "act-service-menu",
            name: "Service Menu Card",
            category: "crm_action",
            icon: "layers",
            actionKey: "open_service_menu",
            badge: "OomaLabs",
            tooltip: "Showcase standard technology packages and solution blueprints",
            primary: true
          },
          {
            id: "act-quotation-gen",
            name: "Quotation Suite",
            category: "crm_action",
            icon: "calculator",
            actionKey: "open_quotation_generator",
            badge: "OomaLabs",
            tooltip: "Generate and customize a commercial proposal for the client"
          }
        ]
      },
      {
        id: "d6-t3",
        dayNumber: 6,
        title: "Advance Good Opportunities in CRM Pipeline",
        objective: "Move responsive leads from 'Contacted' to 'Meeting Scheduled', 'Proposal Sent', or 'Negotiation'.",
        targetMetric: "Target: ≥2 deals moved forward in Pipeline",
        recommendedTools: [
          {
            id: "act-open-pipeline",
            name: "Open CRM Pipeline",
            category: "crm_action",
            icon: "trending-up",
            actionKey: "open_crm_pipeline",
            badge: "CRM",
            tooltip: "Drag and drop or advance lead stages in the Pipeline board",
            primary: true
          }
        ]
      }
    ]
  },
  {
    dayNumber: 7,
    title: "Performance Review & Submission",
    subtitle: "Audit CRM History & Submit Weekly Report for Manager Verification",
    badge: "Day 7 - Weekly Wrap-up",
    tasks: [
      {
        id: "d7-t1",
        dayNumber: 7,
        title: "Review CRM History & Activity Proof",
        objective: "Inspect weekly numbers: leads added, outreach activities logged, meetings conducted, and pipeline deals progressed.",
        targetMetric: "Target: 100% CRM data accuracy",
        recommendedTools: [
          {
            id: "act-open-reports",
            name: "CRM Analytics & Reports",
            category: "crm_action",
            icon: "bar-chart-3",
            actionKey: "open_crm_reports",
            badge: "CRM",
            tooltip: "View analytics breakdown of your weekly leads, activities, and conversion metrics",
            primary: true
          },
          {
            id: "act-audit-summary",
            name: "View Live CRM Audit",
            category: "crm_action",
            icon: "check-circle-2",
            actionKey: "open_audit_modal",
            badge: "Verified",
            primary: true
          }
        ]
      },
      {
        id: "d7-t2",
        dayNumber: 7,
        title: "Submit 7-Day Performance Report for Manager Sign-off",
        objective: "Submit auto-aggregated weekly metrics with your strategic notes for manager audit and approval.",
        targetMetric: "Target: Complete weekly submission",
        recommendedTools: [
          {
            id: "act-submit-report",
            name: "Generate & Submit Report",
            category: "crm_action",
            icon: "send",
            actionKey: "submit_weekly_report",
            badge: "Submission",
            tooltip: "Submits auto-verified CRM performance metrics for manager review",
            primary: true
          }
        ]
      }
    ]
  }
];

// Helper to calculate weekly cycle dates
export function getCycleInfo(cycleOffsetWeeks: number = 0, referenceDate: Date = new Date()): CycleInfo {
  const d = new Date(referenceDate);
  // Normalize to Monday of current week
  const day = d.getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  // Apply offset weeks if browsing past or future cycles
  if (cycleOffsetWeeks !== 0) {
    monday.setDate(monday.getDate() + (cycleOffsetWeeks * 7));
  }

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Determine current day number in cycle (1 to 7)
  const today = new Date();
  let currentDayNumber = 1;
  const isCurrentCycle = cycleOffsetWeeks === 0;

  if (isCurrentCycle) {
    const todayDay = today.getDay();
    currentDayNumber = todayDay === 0 ? 7 : todayDay; // Monday is 1, Sunday is 7
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const startStr = formatDate(monday);
  const endStr = formatDate(sunday);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const displayLabel = `${monthNames[monday.getMonth()]} ${monday.getDate()} – ${monthNames[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`;

  return {
    cycleStartDate: startStr,
    cycleEndDate: endStr,
    currentDayNumber,
    isCurrentCycle,
    displayLabel
  };
}

// Local storage key helper
function getStorageKey(workspaceId: string, userId: string, cycleStartDate: string): string {
  return `ooma_sales_plan_${workspaceId}_${userId}_${cycleStartDate}`;
}

export const crmSalesPlanService = {
  // Fetch checked tasks for a user in a given cycle
  async fetchCycleProgress(workspaceId: string, userId: string, cycleStartDate: string): Promise<Record<string, boolean>> {
    const progressMap: Record<string, boolean> = {};

    // 1. Check LocalStorage first for instant rendering
    const localKey = getStorageKey(workspaceId, userId, cycleStartDate);
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        Object.assign(progressMap, JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Could not read local sales plan cache", e);
    }

    // 2. Query Supabase (with graceful degradation if table not migrated yet)
    try {
      const { data, error } = await supabase
        .from('crm_sales_plan_progress')
        .select('task_id, completed')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('cycle_start_date', cycleStartDate);

      if (!error && data) {
        data.forEach((row: any) => {
          progressMap[row.task_id] = row.completed;
        });
        // Sync back to local storage
        localStorage.setItem(localKey, JSON.stringify(progressMap));
      }
    } catch (err) {
      console.warn("Supabase crm_sales_plan_progress query skipped or failed, using local storage", err);
    }

    return progressMap;
  },

  // Toggle a task's completed state
  async toggleTask(
    workspaceId: string,
    userId: string,
    cycleStartDate: string,
    dayNumber: number,
    taskId: string,
    currentCompleted: boolean
  ): Promise<boolean> {
    const newCompleted = !currentCompleted;

    // 1. Immediately persist to LocalStorage
    const localKey = getStorageKey(workspaceId, userId, cycleStartDate);
    try {
      const cached = JSON.parse(localStorage.getItem(localKey) || '{}');
      cached[taskId] = newCompleted;
      localStorage.setItem(localKey, JSON.stringify(cached));
    } catch (e) {
      console.warn("Failed updating local storage", e);
    }

    // 2. Upsert to Supabase
    try {
      await supabase
        .from('crm_sales_plan_progress')
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: userId,
            cycle_start_date: cycleStartDate,
            day_number: dayNumber,
            task_id: taskId,
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'workspace_id,user_id,cycle_start_date,day_number,task_id' }
        );
    } catch (err) {
      console.warn("Supabase upsert failed, task state preserved locally", err);
    }

    return newCompleted;
  },

  // Verify Actual CRM Database Records against the Plan (For Manager & Rep Views)
  async computeActualCrmMetrics(
    workspaceId: string,
    userId: string,
    cycleStartDate: string,
    cycleEndDate: string
  ): Promise<ActualCrmMetrics> {
    const startIso = new Date(`${cycleStartDate}T00:00:00Z`).toISOString();
    const endIso = new Date(`${cycleEndDate}T23:59:59Z`).toISOString();

    const metrics: ActualCrmMetrics = {
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
    };

    try {
      // 1. Actual Leads created in CRM during this cycle
      const { data: leadsData } = await supabase
        .from('crm_leads')
        .select('id, confidence, status, custom_data, created_at')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (leadsData) {
        metrics.leadsCreatedCount = leadsData.length;
        leadsData.forEach((lead: any) => {
          const temp = (lead.custom_data?.temperature || '').toLowerCase();
          const conf = lead.confidence || 0;
          if (temp.includes('hot') || conf >= 75) {
            metrics.hotLeadsCount++;
          } else if (temp.includes('warm') || (conf >= 40 && conf < 75)) {
            metrics.warmLeadsCount++;
          } else if (temp.includes('cold') || conf < 40) {
            metrics.coldLeadsCount++;
          }

          if (['Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Won (Converted)'].includes(lead.status)) {
            metrics.dealsProgressedCount++;
          }
        });
      }

      // 2. Actual Activities logged in CRM during this cycle
      const { data: actsData } = await supabase
        .from('crm_activities')
        .select('id, activity_type, created_at, description')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (actsData) {
        metrics.activitiesCount = actsData.length;
        actsData.forEach((act: any) => {
          const type = (act.activity_type || '').toLowerCase();
          const desc = (act.description || '').toLowerCase();
          if (type.includes('call') || desc.includes('call')) {
            metrics.callsCount++;
          } else if (type.includes('whatsapp') || desc.includes('whatsapp') || desc.includes('wa')) {
            metrics.whatsAppCount++;
          } else if (type.includes('email') || type.includes('mail') || desc.includes('email')) {
            metrics.emailsCount++;
          }
        });
      }

      // 3. Actual Meetings scheduled in CRM Tasks during this cycle
      const { data: tasksData } = await supabase
        .from('crm_tasks')
        .select('id, activity_type, title, status, created_at')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to', userId)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (tasksData) {
        tasksData.forEach((t: any) => {
          const actType = (t.activity_type || '').toLowerCase();
          const title = (t.title || '').toLowerCase();
          if (actType.includes('meeting') || title.includes('meet') || title.includes('demo') || title.includes('zoom')) {
            metrics.meetingsBookedCount++;
          }
        });
      }
    } catch (err) {
      console.warn("Could not compute full DB verification metrics", err);
    }

    return metrics;
  },

  // Submit Day 7 Weekly Report
  async submitWeeklyReport(report: WeeklyReportData): Promise<boolean> {
    const reportKey = `ooma_sales_report_${report.workspaceId}_${report.userId}_${report.cycleStartDate}`;
    localStorage.setItem(reportKey, JSON.stringify(report));

    try {
      await supabase
        .from('crm_weekly_sales_reports')
        .upsert(
          {
            workspace_id: report.workspaceId,
            user_id: report.userId,
            cycle_start_date: report.cycleStartDate,
            cycle_end_date: report.cycleEndDate,
            leads_created_count: report.leadsCreatedCount,
            activities_logged_count: report.activitiesLoggedCount,
            meetings_booked_count: report.meetingsBookedCount,
            deals_progressed_count: report.dealsProgressedCount,
            summary_notes: report.summaryNotes,
            manager_status: report.managerStatus,
            submitted_at: new Date().toISOString()
          },
          { onConflict: 'workspace_id,user_id,cycle_start_date' }
        );
      return true;
    } catch (err) {
      console.warn("Report stored locally (Supabase write failed)", err);
      return true;
    }
  },

  // Fetch Submitted Weekly Report (for rep or manager audit)
  async fetchWeeklyReport(workspaceId: string, userId: string, cycleStartDate: string): Promise<WeeklyReportData | null> {
    const reportKey = `ooma_sales_report_${workspaceId}_${userId}_${cycleStartDate}`;
    try {
      const { data, error } = await supabase
        .from('crm_weekly_sales_reports')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('cycle_start_date', cycleStartDate)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          cycleStartDate: data.cycle_start_date,
          cycleEndDate: data.cycle_end_date,
          userId: data.user_id,
          workspaceId: data.workspace_id,
          leadsCreatedCount: data.leads_created_count,
          activitiesLoggedCount: data.activities_logged_count,
          meetingsBookedCount: data.meetings_booked_count,
          dealsProgressedCount: data.deals_progressed_count,
          summaryNotes: data.summary_notes,
          managerStatus: data.manager_status,
          managerFeedback: data.manager_feedback,
          reviewedBy: data.reviewed_by,
          reviewedAt: data.reviewed_at,
          submittedAt: data.submitted_at
        };
      }
    } catch (err) {
      console.warn("Supabase fetch report failed, checking local storage", err);
    }

    try {
      const cached = localStorage.getItem(reportKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Local storage report read error", e);
    }

    return null;
  },

  // Manager Review / Sign-off
  async reviewWeeklyReport(
    workspaceId: string,
    userId: string,
    cycleStartDate: string,
    managerId: string,
    status: 'Approved' | 'Needs Improvement',
    feedback: string
  ): Promise<boolean> {
    const reportKey = `ooma_sales_report_${workspaceId}_${userId}_${cycleStartDate}`;
    try {
      const cached = JSON.parse(localStorage.getItem(reportKey) || '{}');
      cached.managerStatus = status;
      cached.managerFeedback = feedback;
      cached.reviewedBy = managerId;
      cached.reviewedAt = new Date().toISOString();
      localStorage.setItem(reportKey, JSON.stringify(cached));
    } catch (e) {
      console.warn("Local cache update failed", e);
    }

    try {
      await supabase
        .from('crm_weekly_sales_reports')
        .update({
          manager_status: status,
          manager_feedback: feedback,
          reviewed_by: managerId,
          reviewed_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('cycle_start_date', cycleStartDate);
      return true;
    } catch (err) {
      console.warn("Manager review saved locally (Supabase update failed)", err);
      return true;
    }
  }
};
