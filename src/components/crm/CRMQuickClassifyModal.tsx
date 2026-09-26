import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Flame, Sun, Snowflake, Check, Loader2 } from 'lucide-react';
import { useCRMData } from '@/contexts/CRMDataContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { resolveLeadCompanyName, resolveLeadContactPerson } from '@/utils/crmLeadUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultRating?: 'Hot' | 'Warm' | 'Cold';
}

export default function CRMQuickClassifyModal({ isOpen, onClose, defaultRating = 'Hot' }: Props) {
  const { leads, refreshLeads } = useCRMData();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [rating, setRating] = useState<'Hot' | 'Warm' | 'Cold'>(defaultRating);
  const [confidence, setConfidence] = useState<number>(defaultRating === 'Hot' ? 85 : defaultRating === 'Warm' ? 55 : 25);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRatingChange = (newRating: 'Hot' | 'Warm' | 'Cold') => {
    setRating(newRating);
    if (newRating === 'Hot') setConfidence(85);
    else if (newRating === 'Warm') setConfidence(55);
    else setConfidence(25);
  };

  const handleSave = async () => {
    if (!selectedLeadId) {
      toast.error("Please select a lead to classify");
      return;
    }

    setSubmitting(true);
    try {
      const selectedLead = leads.find(l => l.id === selectedLeadId);
      const existingCustom = selectedLead?.custom_data || {};

      const { error } = await supabase
        .from('crm_leads')
        .update({
          confidence: confidence,
          tags: rating,
          custom_data: {
            ...existingCustom,
            temperature: rating,
            classified_at: new Date().toISOString()
          }
        })
        .eq('id', selectedLeadId);

      if (error) throw error;

      toast.success(`Lead successfully classified as ${rating.toUpperCase()}!`);
      await refreshLeads();
      onClose();
    } catch (err: any) {
      console.error("Failed to classify lead", err);
      toast.error(err?.message || "Failed to update classification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            {rating === 'Hot' && <Flame className="w-5 h-5 text-rose-500 animate-pulse" />}
            {rating === 'Warm' && <Sun className="w-5 h-5 text-amber-500" />}
            {rating === 'Cold' && <Snowflake className="w-5 h-5 text-blue-400" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Classify Lead Temperature</h2>
            <p className="text-xs text-muted-foreground">Day 3 Qualification & Priority Segmentation</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Lead to Qualify
            </label>
            <select
              value={selectedLeadId}
              onChange={e => setSelectedLeadId(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Choose Lead from CRM --</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {resolveLeadCompanyName(l)} ({resolveLeadContactPerson(l) || 'No Contact'}) - Current: {l.tags || l.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Temperature Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRatingChange('Hot')}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition ${
                  rating === 'Hot'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Flame className="w-5 h-5 mb-1.5 text-rose-500" />
                <span className="font-bold text-xs">Hot 🔥</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">High Intent</span>
              </button>

              <button
                type="button"
                onClick={() => handleRatingChange('Warm')}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition ${
                  rating === 'Warm'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Sun className="w-5 h-5 mb-1.5 text-amber-500" />
                <span className="font-bold text-xs">Warm ☀️</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Interested</span>
              </button>

              <button
                type="button"
                onClick={() => handleRatingChange('Cold')}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition ${
                  rating === 'Cold'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Snowflake className="w-5 h-5 mb-1.5 text-blue-400" />
                <span className="font-bold text-xs">Cold ❄️</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Nurture</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confidence Level
              </label>
              <span className="text-xs font-bold text-primary">{confidence}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={confidence}
              onChange={e => setConfidence(parseInt(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Update Classification
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
