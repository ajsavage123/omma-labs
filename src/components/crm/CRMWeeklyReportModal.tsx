import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Send, BarChart3, CheckCircle2, Award, Loader2 } from 'lucide-react';
import { crmSalesPlanService, type ActualCrmMetrics } from '@/services/crmSalesPlanService';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  metrics: ActualCrmMetrics;
  onSubmitted?: () => void;
}

export default function CRMWeeklyReportModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  cycleStartDate,
  cycleEndDate,
  metrics,
  onSubmitted
}: Props) {
  const [summaryNotes, setSummaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ok = await crmSalesPlanService.submitWeeklyReport({
        cycleStartDate,
        cycleEndDate,
        userId,
        workspaceId,
        leadsCreatedCount: metrics.leadsCreatedCount,
        activitiesLoggedCount: metrics.activitiesCount,
        meetingsBookedCount: metrics.meetingsBookedCount,
        dealsProgressedCount: metrics.dealsProgressedCount,
        summaryNotes: summaryNotes.trim() || 'Weekly sales cadence completed with verified CRM outcomes.',
        managerStatus: 'Pending Review'
      });

      if (ok) {
        toast.success("7-Day Sales Report submitted for Manager Review!");
        onSubmitted?.();
        onClose();
      } else {
        toast.error("Failed to submit weekly report");
      }
    } catch (err: any) {
      toast.error(err?.message || "Report submission error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Day 7: Weekly Performance Submission</h2>
            <p className="text-xs text-muted-foreground">Auto-compiled from your verified CRM database records</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-muted/30 border border-border rounded-xl text-center">
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Leads Created</span>
              <span className="text-xl font-black text-foreground">{metrics.leadsCreatedCount}</span>
            </div>
            <div className="p-3 bg-muted/30 border border-border rounded-xl text-center">
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Outreach Logged</span>
              <span className="text-xl font-black text-foreground">{metrics.activitiesCount}</span>
            </div>
            <div className="p-3 bg-muted/30 border border-border rounded-xl text-center">
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Meetings Booked</span>
              <span className="text-xl font-black text-foreground">{metrics.meetingsBookedCount}</span>
            </div>
            <div className="p-3 bg-muted/30 border border-border rounded-xl text-center">
              <span className="block text-[11px] font-semibold uppercase text-muted-foreground">Deals Advanced</span>
              <span className="text-xl font-black text-foreground">{metrics.dealsProgressedCount}</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All stats above are computed live from CRM history to ensure 100% data audit integrity.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Strategic Summary & Highlights for Manager
            </label>
            <textarea
              rows={4}
              required
              value={summaryNotes}
              onChange={e => setSummaryNotes(e.target.value)}
              placeholder="Summary of this cycle: key responses received, objections overcome, high-value opportunities in negotiation, and next week's goals..."
              className="w-full bg-background border border-input rounded-lg p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-primary" />
              Cycle: {cycleStartDate} to {cycleEndDate}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
