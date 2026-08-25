import { useState, useMemo } from 'react';
import { useCRMData } from '@/contexts/CRMDataContext';
import { findDuplicateLeads, type Lead } from '@/utils/crmDuplicateFinder';
import { AlertTriangle, Trash2, CheckCircle2, UserCheck, ShieldAlert, X, Sparkles, Filter, GitMerge } from 'lucide-react';
import { toast } from 'sonner';
import CRMLeadMergeModal from './CRMLeadMergeModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CRMDuplicateLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CRMDuplicateLeadsModal({ isOpen, onClose }: CRMDuplicateLeadsModalProps) {
  const { allLeads, deleteLead, updateLead } = useCRMData();
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Exact Email' | 'Exact Phone' | 'Company & Contact Match'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Merge Modal State
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTargetA, setMergeTargetA] = useState<Lead | null>(null);
  const [mergeTargetB, setMergeTargetB] = useState<Lead | null>(null);

  const duplicateAnalysis = useMemo(() => {
    return findDuplicateLeads(allLeads || []);
  }, [allLeads]);

  const filteredGroups = useMemo(() => {
    if (selectedFilter === 'All') return duplicateAnalysis.groups;
    return duplicateAnalysis.groups.filter(g => g.reason === selectedFilter);
  }, [duplicateAnalysis.groups, selectedFilter]);

  if (!isOpen) return null;

  const handleDeleteOne = async (leadId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete the duplicate lead "${companyName}"?`)) return;
    setDeletingId(leadId);
    try {
      await deleteLead(leadId);
      toast.success("Duplicate lead deleted");
    } catch (err: any) {
      toast.error("Failed to delete duplicate lead");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenMergeModal = (groupLeads: Lead[]) => {
    if (groupLeads.length < 2) return;
    setMergeTargetA(groupLeads[0]);
    setMergeTargetB(groupLeads[1]);
    setMergeModalOpen(true);
  };

  const handleQuickKeepPrimary = async (primaryLead: Lead, groupLeads: Lead[]) => {
    const redundantLeads = groupLeads.filter(l => l.id !== primaryLead.id);
    if (redundantLeads.length === 0) return;

    if (!window.confirm(`Keep "${primaryLead.company_name || primaryLead.contact_person}" as primary lead and delete ${redundantLeads.length} duplicate(s)?`)) {
      return;
    }

    try {
      let consolidatedNotes = primaryLead.notes || '';
      redundantLeads.forEach(r => {
        if (r.notes && !consolidatedNotes.includes(r.notes)) {
          consolidatedNotes += `\n\n--- Merged from Duplicate (${r.contact_person || r.id}) ---\n${r.notes}`;
        }
      });

      if (consolidatedNotes !== (primaryLead.notes || '')) {
        await updateLead(primaryLead.id, { notes: consolidatedNotes });
      }

      for (const r of redundantLeads) {
        await deleteLead(r.id);
      }

      toast.success("Duplicate leads consolidated!");
    } catch (e: any) {
      toast.error("Failed to merge duplicate leads");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden text-card-foreground">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-foreground">Duplicate Lead Detection</h2>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-semibold text-xs">
                    {duplicateAnalysis.totalGroupCount} Groups • {duplicateAnalysis.totalDuplicatesCount} Leads
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                  Review matching records across sales representatives and resolve duplicates
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

          {/* Filter Bar */}
          <div className="px-6 py-3 border-b border-border bg-background flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter size={12} /> Filter:
              </span>
              {(['All', 'Exact Email', 'Exact Phone', 'Company & Contact Match'] as const).map(filterReason => (
                <button
                  key={filterReason}
                  onClick={() => setSelectedFilter(filterReason)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${
                    selectedFilter === filterReason
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {filterReason}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Showing <strong className="text-foreground">{filteredGroups.length}</strong> matching clusters
            </p>
          </div>

          {/* Clusters List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-muted/10">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-card border border-dashed border-border rounded-xl p-8">
                <div className="h-12 w-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-base font-bold text-foreground">No Duplicate Leads Detected</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  All active leads across all sales representatives have unique contact information.
                </p>
              </div>
            ) : (
              filteredGroups.map(group => (
                <div key={group.id} className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
                  
                  {/* Group Bar */}
                  <div className="px-4 py-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        Match: {group.reason}
                      </Badge>
                      <span className="text-xs font-mono text-foreground font-semibold bg-background px-2.5 py-0.5 rounded border border-border">
                        {group.matchValue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {group.leads.length >= 2 && (
                        <Button
                          onClick={() => handleOpenMergeModal(group.leads)}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <GitMerge size={13} /> Select & Merge Fields
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Duplicate Cards Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.leads.map(lead => {
                      const assignedRepName = lead.assigned_user?.full_name || lead.assigned_user?.username || 'Unassigned';
                      return (
                        <div 
                          key={lead.id} 
                          className="bg-background border border-border/80 rounded-xl p-3.5 space-y-3 flex flex-col justify-between hover:border-border transition-colors"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-foreground leading-snug">
                                  {lead.company_name || 'Unnamed Company'}
                                </h4>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {lead.contact_person || 'No Contact'}
                                </p>
                              </div>
                              <Badge className="text-[10px] uppercase font-semibold">
                                {lead.status || 'New Lead'}
                              </Badge>
                            </div>

                            <div className="text-xs space-y-1 text-muted-foreground pt-2 border-t border-border/50">
                              {lead.email && (
                                <p className="truncate"><span className="font-semibold text-foreground">Email:</span> {lead.email}</p>
                              )}
                              {lead.phone && (
                                <p><span className="font-semibold text-foreground">Phone:</span> {lead.phone}</p>
                              )}
                              {lead.created_at && (
                                <p className="text-[11px] text-muted-foreground">
                                  Added: {new Date(lead.created_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            {/* Sales Rep Owner */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40">
                              <UserCheck size={13} className="text-primary" />
                              <span className="truncate">Assigned: {assignedRepName}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                            <Button
                              onClick={() => handleQuickKeepPrimary(lead, group.leads)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-semibold flex-1 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Sparkles size={12} /> Set Master
                            </Button>
                            <Button
                              onClick={() => handleDeleteOne(lead.id, lead.company_name || lead.contact_person || 'Lead')}
                              disabled={deletingId === lead.id}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete Lead"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-500" /> Changes affect cross-rep workspace leads
            </span>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium px-4"
            >
              Close
            </Button>
          </div>

        </div>
      </div>

      {/* Merge Fields Modal */}
      <CRMLeadMergeModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        leadA={mergeTargetA}
        leadB={mergeTargetB}
      />
    </>
  );
}

