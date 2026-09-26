import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Phone, MessageCircle, Mail, Calendar, FileText, Loader2, Check } from 'lucide-react';
import { useCRMData } from '@/contexts/CRMDataContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { resolveLeadCompanyName, resolveLeadContactPerson } from '@/utils/crmLeadUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note';
}

export default function CRMQuickActivityModal({ isOpen, onClose, defaultType = 'call' }: Props) {
  const { user } = useAuth();
  const { leads, refreshActivities } = useCRMData();

  const [activityType, setActivityType] = useState<string>(defaultType);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [outcome, setOutcome] = useState<string>('Connected');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    setActivityType(defaultType);
    if (defaultType === 'call') setOutcome('Connected & Discussed Requirements');
    else if (defaultType === 'whatsapp') setOutcome('Intro Pitch Sent via WhatsApp');
    else if (defaultType === 'email') setOutcome('Executive Email Pitch Sent');
    else if (defaultType === 'meeting') setOutcome('Discovery Demo Scheduled');
    else setOutcome('General Prospect Note');
  }, [defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id) return;

    if (!selectedLeadId && leads.length > 0) {
      toast.error("Please select a lead to record this activity against");
      return;
    }

    setSubmitting(true);
    try {
      const fullDesc = `${outcome}: ${description}`.trim();
      const { error } = await supabase.from('crm_activities').insert([{
        workspace_id: user.workspace_id,
        lead_id: selectedLeadId || (leads[0]?.id || null),
        user_id: user.id,
        activity_type: activityType,
        description: fullDesc
      }]);

      if (error && error.code !== '22P02') throw error;

      toast.success(`${activityType.toUpperCase()} outcome logged to CRM!`);
      await refreshActivities();
      onClose();
      setDescription('');
    } catch (err: any) {
      console.error("Failed to log activity", err);
      toast.error(err?.message || "Failed to log activity");
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
            {activityType === 'call' && <Phone className="w-5 h-5" />}
            {activityType === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
            {activityType === 'email' && <Mail className="w-5 h-5" />}
            {activityType === 'meeting' && <Calendar className="w-5 h-5" />}
            {activityType === 'note' && <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Record Outreach Outcome in CRM</h2>
            <p className="text-xs text-muted-foreground">Every touchpoint writes directly to your active CRM timeline</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Activity Channel
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { key: 'call', label: 'Call', icon: Phone },
                { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                { key: 'email', label: 'Email', icon: Mail },
                { key: 'meeting', label: 'Meeting', icon: Calendar },
                { key: 'note', label: 'Note', icon: FileText }
              ].map(t => {
                const Icon = t.icon;
                const isActive = activityType === t.key;
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => setActivityType(t.key)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium border transition ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Associate with CRM Lead
            </label>
            <select
              value={selectedLeadId}
              onChange={e => setSelectedLeadId(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Target Lead --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {resolveLeadCompanyName(l)} ({resolveLeadContactPerson(l) || 'No Contact Person'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Outcome Summary
            </label>
            <input
              type="text"
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              placeholder="e.g. Connected with Director, Pitch sent"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Notes & Next Actions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Record details of conversation, client needs, budget discussed, or follow-up date..."
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save to CRM Activity
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
