import { supabase } from '@/lib/supabase';

export interface QuotaMetric {
  name: string;
  current: number;
  max: number;
  unit: string;
  percentage: number;
  status: 'good' | 'warning' | 'critical';
  details: string;
}

export interface QuotaHealthData {
  databaseStorage: QuotaMetric;
  realtimeConnections: QuotaMetric;
  realtimeMessages: QuotaMetric;
  egressBandwidth: QuotaMetric;
  authMAU: QuotaMetric;
  autoPauseHealth: {
    hoursRemaining: number;
    daysRemaining: number;
    lastActivityDate: string;
    status: 'safe' | 'warning' | 'danger';
  };
  totalRows: number;
  cachedAt: number;
}

const CACHE_KEY = 'supabase_quota_health_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache to protect free tier quotas

export const quotaMonitorService = {
  async getQuotaStats(_workspaceId?: string, forceRefresh = false): Promise<QuotaHealthData> {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: QuotaHealthData = JSON.parse(cached);
          if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
            return parsed;
          }
        }
      } catch {
        // ignore cache parse errors
      }
    }

    // Execute count-only queries (head: true transfers ZERO row payload data over egress)
    const tables = [
      'crm_leads',
      'crm_tasks',
      'crm_activities',
      'projects',
      'users',
      'library_docs',
      'meetings'
    ];

    let totalRows = 0;
    const tableCounts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          tableCounts[table] = count;
          totalRows += count;
        } else {
          tableCounts[table] = 0;
        }
      } catch {
        tableCounts[table] = 0;
      }
    }

    // Estimate Database Storage (approx 1.5 KB per average row + schema indexes)
    const estimatedDbBytes = totalRows * 1536 + 1048576; // base 1MB schema + row estimates
    const dbSizeMB = Number((estimatedDbBytes / (1024 * 1024)).toFixed(2));
    const dbMaxMB = 500; // Supabase Free Plan limit
    const dbPercent = Math.min(100, Number(((dbSizeMB / dbMaxMB) * 100).toFixed(1)));

    // Calculate Auth MAU
    const userCount = tableCounts['users'] || 1;
    const mauMax = 50000;
    const mauPercent = Number(((userCount / mauMax) * 100).toFixed(2));

    // Estimate Realtime Connections (1 active multiplexed socket channel per logged in user tab)
    const activeSockets = Math.max(1, Math.min(200, userCount));
    const connectionsMax = 200;
    const connPercent = Number(((activeSockets / connectionsMax) * 100).toFixed(1));

    // Estimate Realtime Messages per month (approx 150 msgs/day per active task/lead)
    const estimatedMonthlyMsgs = Math.min(2000000, totalRows * 120 + 500);
    const msgMax = 2000000;
    const msgPercent = Number(((estimatedMonthlyMsgs / msgMax) * 100).toFixed(2));

    // Estimate Egress Bandwidth
    const estimatedEgressGB = Number(((totalRows * 0.0005) + 0.05).toFixed(2));
    const egressMaxGB = 5.0;
    const egressPercent = Number(((estimatedEgressGB / egressMaxGB) * 100).toFixed(1));

    // Fetch timestamp of most recent activity across CRM tables to evaluate 7-Day Auto-Pause
    let latestActivityTimestamp = Date.now() - 3600000; // default 1 hr ago

    try {
      const { data: latestLead } = await supabase
        .from('crm_leads')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestLead?.created_at) {
        latestActivityTimestamp = Math.max(latestActivityTimestamp, new Date(latestLead.created_at).getTime());
      }
    } catch {
      // fallback
    }

    const elapsedHours = (Date.now() - latestActivityTimestamp) / (1000 * 60 * 60);
    const maxInactiveHours = 7 * 24; // 168 hours = 7 days
    const hoursRemaining = Math.max(0, Math.floor(maxInactiveHours - elapsedHours));
    const daysRemaining = Number((hoursRemaining / 24).toFixed(1));

    const autoPauseStatus: 'safe' | 'warning' | 'danger' = 
      daysRemaining >= 3 ? 'safe' : daysRemaining >= 1 ? 'warning' : 'danger';

    const getStatus = (percent: number): 'good' | 'warning' | 'critical' => 
      percent < 60 ? 'good' : percent < 85 ? 'warning' : 'critical';

    const data: QuotaHealthData = {
      databaseStorage: {
        name: 'Database Storage',
        current: dbSizeMB,
        max: dbMaxMB,
        unit: 'MB',
        percentage: dbPercent,
        status: getStatus(dbPercent),
        details: `${totalRows.toLocaleString()} total database rows across all tables`
      },
      realtimeConnections: {
        name: 'Realtime Connections',
        current: activeSockets,
        max: connectionsMax,
        unit: 'Sockets',
        percentage: connPercent,
        status: getStatus(connPercent),
        details: 'Multiplexed 1-channel per active tab'
      },
      realtimeMessages: {
        name: 'Monthly Realtime Messages',
        current: estimatedMonthlyMsgs,
        max: msgMax,
        unit: 'Msgs',
        percentage: msgPercent,
        status: getStatus(msgPercent),
        details: `${(tableCounts['crm_tasks'] || 0).toLocaleString()} scheduled tasks sync activity & Realtime events`
      },
      egressBandwidth: {
        name: 'Outbound Egress Bandwidth',
        current: estimatedEgressGB,
        max: egressMaxGB,
        unit: 'GB',
        percentage: egressPercent,
        status: getStatus(egressPercent),
        details: 'REST API JSON payloads & socket transfer'
      },
      authMAU: {
        name: 'Monthly Active Users (Auth)',
        current: userCount,
        max: mauMax,
        unit: 'MAUs',
        percentage: mauPercent,
        status: getStatus(mauPercent),
        details: 'Registered members & team profiles'
      },
      autoPauseHealth: {
        hoursRemaining,
        daysRemaining,
        lastActivityDate: new Date(latestActivityTimestamp).toLocaleString(),
        status: autoPauseStatus
      },
      totalRows,
      cachedAt: Date.now()
    };

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage full errors
    }

    return data;
  },

  async sendKeepAlivePing(): Promise<boolean> {
    try {
      // Lightweight single row fetch to register active API traffic and reset 7-day auto-pause
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
};
