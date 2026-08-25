import { useState } from 'react';
import { useCRMData } from '@/contexts/CRMDataContext';
import { type Lead } from '@/utils/crmDuplicateFinder';
import { GitMerge, Check, X, Shield, Sparkles, UserCheck, DollarSign, Tag, Mail, Phone, Building } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CRMLeadMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadA: Lead | null;
  leadB: Lead | null;
}

export default function CRMLeadMergeModal({ isOpen, onClose, leadA, leadB }: CRMLeadMergeModalProps) {
  const { updateLead, deleteLead } = useCRMData();
  const [submitting, setSubmitting] = useState(false);

  // Field Selection State (defaults to Lead A's non-empty values)
  const [selectedFields, setSelectedFields] = useState<Record<string, 'A' | 'B'>>({
    company_name: 'A',
    contact_person: 'A',
    email: 'A',
    phone: 'A',
    status: 'A',
    estimated_value: 'A',
    assigned_to: 'A',
    service_interest: 'A'
  });

  if (!isOpen || !leadA || !leadB) return null;

  const handleFieldSelect = (field: string, source: 'A' | 'B') => {
    setSelectedFields(prev => ({ ...prev, [field]: source }));
  };

  const getValue = (field: keyof Lead, source: 'A' | 'B') => {
    const target = source === 'A' ? leadA : leadB;
    return target[field] !== undefined && target[field] !== null ? target[field] : '';
  };

  const handleExecuteMerge = async () => {
    setSubmitting(true);
    try {
      const mergedPayload: Record<string, any> = {
        company_name: getValue('company_name', selectedFields.company_name) || leadA.company_name || leadB.company_name,
        contact_person: getValue('contact_person', selectedFields.contact_person) || leadA.contact_person || leadB.contact_person,
        email: getValue('email', selectedFields.email) || leadA.email || leadB.email,
        phone: getValue('phone', selectedFields.phone) || leadA.phone || leadB.phone,
        status: getValue('status', selectedFields.status) || leadA.status || leadB.status,
        estimated_value: getValue('estimated_value', selectedFields.estimated_value) || leadA.estimated_value || leadB.estimated_value || 0,
        assigned_to: getValue('assigned_to', selectedFields.assigned_to) || leadA.assigned_to || leadB.assigned_to,
        service_interest: getValue('service_interest', selectedFields.service_interest) || leadA.service_interest || leadB.service_interest
      };

      let finalNotes = leadA.notes || '';
      if (leadB.notes && !finalNotes.includes(leadB.notes)) {
        finalNotes += `\n\n--- Merged from Duplicate Record (${leadB.company_name || leadB.id}) ---\n${leadB.notes}`;
      }
      mergedPayload.notes = finalNotes;

      await updateLead(leadA.id, mergedPayload);
      await deleteLead(leadB.id);

      toast.success("Lead merge completed!");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to complete lead merge");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldsToCompare = [
    { key: 'company_name', label: 'Company Name', icon: Building },
    { key: 'contact_person', label: 'Contact Person', icon: Shield },
    { key: 'email', label: 'Email Address', icon: Mail },
    { key: 'phone', label: 'Phone Number', icon: Phone },
    { key: 'status', label: 'Pipeline Stage', icon: Tag },
    { key: 'estimated_value', label: 'Estimated Deal Value ($)', icon: DollarSign },
    { key: 'assigned_to', label: 'Assigned Sales Rep', icon: UserCheck },
    { key: 'service_interest', label: 'Service Interest', icon: Sparkles }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-card-foreground">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
              <GitMerge size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Merge Lead Fields</h2>
                <Badge variant="outline" className="text-xs font-semibold">
                  Field Selector
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                Compare values side-by-side and choose which values to keep for the master lead
              </p>
            </div>
          </div>
          <Button 
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Lead Headers */}
        <div className="grid grid-cols-2 bg-muted/40 px-6 py-3 border-b border-border text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">A</span>
            <span className="truncate text-foreground font-bold">Lead A: {leadA.company_name || leadA.contact_person}</span>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-border">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold">B</span>
            <span className="truncate text-foreground font-bold">Lead B: {leadB.company_name || leadB.contact_person}</span>
          </div>
        </div>

        {/* Field Selection Matrix */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar bg-muted/10">
          {fieldsToCompare.map(field => {
            const valA = getValue(field.key as keyof Lead, 'A');
            const valB = getValue(field.key as keyof Lead, 'B');
            const Icon = field.icon;
            const isSelectedA = selectedFields[field.key] === 'A';
            const isSelectedB = selectedFields[field.key] === 'B';

            return (
              <div key={field.key} className="bg-card border border-border/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Icon size={13} className="text-primary" />
                  <span>{field.label}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option A */}
                  <button
                    onClick={() => handleFieldSelect(field.key, 'A')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelectedA
                        ? 'bg-primary/10 border-primary text-foreground font-medium shadow-xs'
                        : 'bg-background border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {field.key === 'assigned_to' 
                          ? (leadA.assigned_user?.full_name || leadA.assigned_user?.username || valA || 'Unassigned')
                          : (valA || <span className="text-muted-foreground/60 italic font-normal">Empty</span>)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">From Lead A</p>
                    </div>
                    {isSelectedA && (
                      <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check size={10} />
                      </div>
                    )}
                  </button>

                  {/* Option B */}
                  <button
                    onClick={() => handleFieldSelect(field.key, 'B')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                      isSelectedB
                        ? 'bg-primary/10 border-primary text-foreground font-medium shadow-xs'
                        : 'bg-background border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {field.key === 'assigned_to'
                          ? (leadB.assigned_user?.full_name || leadB.assigned_user?.username || valB || 'Unassigned')
                          : (valB || <span className="text-muted-foreground/60 italic font-normal">Empty</span>)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">From Lead B</p>
                    </div>
                    {isSelectedB && (
                      <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check size={10} />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
            <Sparkles className="text-emerald-500 shrink-0" size={16} />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              Notes and history from Lead B will be automatically combined into Lead A before deletion.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium px-4"
          >
            Cancel
          </Button>

          <Button
            onClick={handleExecuteMerge}
            disabled={submitting}
            size="sm"
            className="h-8 text-xs font-semibold px-4 gap-1.5"
          >
            <GitMerge size={14} />
            {submitting ? 'Merging...' : 'Merge & Save Lead'}
          </Button>
        </div>

      </div>
    </div>
  );
}
