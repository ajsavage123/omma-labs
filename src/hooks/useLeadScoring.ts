import { useMemo } from 'react';

// Lead data structures (partial matching the CRM context)
type Lead = {
  id: string;
  status: string;
  email?: string;
  phone?: string;
  estimated_value?: number;
  created_at: string;
  [key: string]: any;
};

type Activity = {
  lead_id?: string;
  created_at: string;
  crm_leads?: {
    company_name: string;
  };
  [key: string]: any;
};

type Task = {
  lead_id?: string;
  status: string;
  [key: string]: any;
};

export type ScoredLead = Lead & { propensityScore: number };

export function useLeadScoring(leads: Lead[] = [], activities: Activity[] = [], tasks: Task[] = []): ScoredLead[] {
  const safeLeads = leads || [];
  const safeActivities = activities || [];
  const safeTasks = tasks || [];
  return useMemo(() => {
    return safeLeads.map((lead) => {
      let score = 0;

      // 1. Stage Weight (max 35 pts)
      const status = lead.status || '';
      if (status === 'Won (Converted)' || status === 'Completed') {
        return { ...lead, propensityScore: 100 }; // Instant 100
      }
      if (status === 'Lost' || status === 'Not Interested') {
        return { ...lead, propensityScore: 0 }; // Instant 0
      }

      if (status === 'Negotiation') score += 35;
      else if (status === 'Proposal Sent') score += 25;
      else if (status === 'Interested') score += 15;
      else if (status === 'Contacted') score += 10;
      else if (status === 'New Leads') score += 5;

      // 2. Interaction History (max 30 pts, 5 pts per activity)
      const leadActivities = safeActivities.filter(
        (a) => a.lead_id === lead.id || (a.crm_leads && a.crm_leads.company_name === lead.company_name)
      );
      const activityScore = Math.min(leadActivities.length * 5, 30);
      score += activityScore;

      // 3. Follow-up / Task Discipline (max 15 pts)
      const leadTasks = safeTasks.filter((t) => t.lead_id === lead.id);
      const completedTasks = leadTasks.filter((t) => t.status === 'Completed').length;
      const hasPendingTasks = leadTasks.some((t) => t.status === 'Pending');
      
      const taskScore = Math.min(completedTasks * 5, 10) + (hasPendingTasks ? 5 : 0);
      score += taskScore;

      // 4. Data Completeness (max 10 pts)
      if (lead.email) score += 3;
      if (lead.phone) score += 3;
      if (lead.estimated_value && lead.estimated_value > 0) score += 4;

      // 5. Recency & Velocity (max 10 pts)
      if (leadActivities.length > 0) {
        // Sort by newest first
        const sortedActivities = [...leadActivities].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastActivityDate = new Date(sortedActivities[0].created_at);
        const daysSinceLastActivity = (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24);

        if (daysSinceLastActivity <= 7) {
          score += 10;
        } else if (daysSinceLastActivity <= 14) {
          score += 5;
        }
      }

      // Cap at 99 for active leads (only Won gets 100)
      const finalScore = Math.min(score, 99);

      return {
        ...lead,
        propensityScore: finalScore,
      };
    });
  }, [leads, activities, tasks]);
}
