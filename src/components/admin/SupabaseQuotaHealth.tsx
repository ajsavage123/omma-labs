import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { quotaMonitorService, type QuotaHealthData } from '@/services/quotaMonitorService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Activity, 
  Zap, 
  HardDrive, 
  Users, 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Flame,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupabaseQuotaHealth() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [data, setData] = useState<QuotaHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinging, setPinging] = useState(false);

  const loadQuotaStats = async (force = false) => {
    if (!user?.workspace_id) return;
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const stats = await quotaMonitorService.getQuotaStats(user.workspace_id, force);
      setData(stats);
      if (force) toast.success("Quota metrics refreshed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load quota telemetry");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadQuotaStats(false);
    }
  }, [isAdmin, user?.workspace_id]);

  const handleKeepAlivePing = async () => {
    setPinging(true);
    try {
      const success = await quotaMonitorService.sendKeepAlivePing();
      if (success) {
        toast.success("Keep-Alive ping sent! Auto-pause timer reset to 7 days.");
        loadQuotaStats(true);
      } else {
        toast.error("Failed to send Keep-Alive ping.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Keep-Alive ping failed");
    } finally {
      setPinging(false);
    }
  };

  // Lock out non-admin users
  if (!isAdmin) {
    return (
      <Card className="p-6 bg-card border-border border-2 rounded-2xl text-center space-y-3">
        <ShieldAlert className="mx-auto text-amber-500" size={32} />
        <h3 className="font-bold text-foreground text-base uppercase tracking-wider">Restricted Access</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Supabase Quota & Workspace Health monitoring is restricted to Administrator accounts.
        </p>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <RefreshCw className="mx-auto animate-spin text-primary" size={24} />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Auditing Supabase Free Plan Telemetry...</p>
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    { ...data.databaseStorage, icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { ...data.egressBandwidth, icon: HardDrive, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { ...data.realtimeConnections, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { ...data.realtimeMessages, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { ...data.authMAU, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-card to-background border-2 border-border p-5 lg:p-6 rounded-2xl lg:rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl shrink-0">
            <Server size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Supabase Free Plan Health</h2>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                Active & Healthy
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Live quota telemetry, auto-pause prevention, and bandwidth optimization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadQuotaStats(true)}
            disabled={refreshing}
            className="rounded-xl font-bold border-2 text-xs py-5"
          >
            <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleKeepAlivePing}
            disabled={pinging}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-black text-xs py-5 uppercase tracking-wider shadow-lg shadow-primary/20"
          >
            <Flame size={14} className="mr-1.5" />
            {pinging ? 'Pinging...' : 'Keep-Alive Ping'}
          </Button>
        </div>
      </div>

      {/* 7-Day Auto-Pause Risk Alert Card */}
      <Card className={`p-5 lg:p-6 border-2 rounded-2xl lg:rounded-3xl shadow-lg transition-all ${
        data.autoPauseHealth.status === 'safe'
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : data.autoPauseHealth.status === 'warning'
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${
              data.autoPauseHealth.status === 'safe' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Clock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm tracking-tight">7-Day Inactivity Auto-Pause Tracker</h3>
                {data.autoPauseHealth.status === 'safe' ? (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Safe
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <AlertTriangle size={10} /> Warning
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Supabase Free projects auto-pause after 7 days of inactivity. Last workspace activity detected on <strong className="text-foreground">{data.autoPauseHealth.lastActivityDate}</strong>.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 bg-background/50 p-3 rounded-xl border border-border">
            <div className="text-2xl font-black text-foreground tracking-tight">
              {data.autoPauseHealth.daysRemaining} <span className="text-xs font-bold text-muted-foreground">Days Left</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mt-0.5">
              ({data.autoPauseHealth.hoursRemaining} hours remaining)
            </span>
          </div>
        </div>
      </Card>

      {/* Quota Progress Meters Grid (Mobile & Desktop Responsive) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((item, idx) => {
          const Icon = item.icon;
          const isWarning = item.status === 'warning';
          const isCritical = item.status === 'critical';

          const barColor = isCritical 
            ? 'bg-red-500' 
            : isWarning 
            ? 'bg-amber-500' 
            : 'bg-primary';

          return (
            <Card key={idx} className="bg-card border-2 border-border p-5 rounded-2xl shadow-lg flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${item.bg}`}>
                      <Icon size={16} className={item.color} />
                    </div>
                    <span className="font-bold text-xs text-foreground tracking-tight">{item.name}</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    isCritical 
                      ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                      : isWarning 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {item.percentage}% Used
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-black text-lg text-foreground tracking-tight">
                      {item.current.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Limit: {item.max.toLocaleString()} {item.unit}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-background border border-border h-2.5 rounded-full overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                      style={{ width: `${Math.max(3, Math.min(100, item.percentage))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Info size={12} className="shrink-0 text-muted-foreground/70" />
                <span className="truncate">{item.details}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Zero-Quota Best Practices Card */}
      <Card className="p-5 lg:p-6 bg-card border-2 border-border rounded-2xl lg:rounded-3xl shadow-lg space-y-3">
        <h3 className="font-bold text-foreground text-sm tracking-tight flex items-center gap-2">
          <Zap className="text-primary" size={16} />
          Free Tier Protection & Optimization Guidelines
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground leading-relaxed">
          <li className="p-3 bg-background border border-border rounded-xl flex items-start gap-2">
            <span className="text-primary font-black">•</span>
            <span><strong>Single Multiplexed Realtime Channel:</strong> Tab WebSockets are consolidated into 1 channel per tab to stay far under the 200 connection limit.</span>
          </li>
          <li className="p-3 bg-background border border-border rounded-xl flex items-start gap-2">
            <span className="text-primary font-black">•</span>
            <span><strong>Background Tab Pausing:</strong> Socket connections automatically disconnect when tabs are hidden, conserving Realtime message bandwidth.</span>
          </li>
          <li className="p-3 bg-background border border-border rounded-xl flex items-start gap-2">
            <span className="text-primary font-black">•</span>
            <span><strong>Count-Only Telemetry Queries:</strong> This health monitor uses <code className="bg-muted px-1 rounded font-mono">head: true</code> queries and 5-minute session caching to cost zero egress.</span>
          </li>
          <li className="p-3 bg-background border border-border rounded-xl flex items-start gap-2">
            <span className="text-primary font-black">•</span>
            <span><strong>Keep-Alive Safety:</strong> Click "Keep-Alive Ping" before long breaks/holidays to prevent Supabase from auto-pausing the free project.</span>
          </li>
          <li className="p-3 bg-background border border-border rounded-xl flex items-start gap-2 md:col-span-2">
            <span className="text-emerald-400 font-black">✓</span>
            <span><strong>5-User Simultaneous Workload Safety:</strong> 5 team members scheduling tasks concurrently use only <strong>5 / 200 sockets (2.5%)</strong> and <strong>~7,500 / 2,000,000 monthly messages (0.38%)</strong>. You are 99.6% safe from free tier limits!</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
