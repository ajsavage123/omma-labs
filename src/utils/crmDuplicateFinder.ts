export interface Lead {
  id: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  status?: string;
  assigned_to?: string;
  assigned_user?: { full_name?: string; username?: string; email?: string };
  created_at?: string;
  estimated_value?: number;
  notes?: string;
  service_interest?: string;
  business_type?: string;
  website?: string;
  [key: string]: any;
}

export interface DuplicateGroup {
  id: string;
  reason: 'Exact Email' | 'Exact Phone' | 'Company & Contact Match';
  matchValue: string;
  leads: Lead[];
}

export interface DuplicateAnalysisResult {
  groups: DuplicateGroup[];
  totalDuplicatesCount: number;
  totalGroupCount: number;
}

export function findDuplicateLeads(leads: Lead[]): DuplicateAnalysisResult {
  if (!leads || !Array.isArray(leads) || leads.length < 2) {
    return { groups: [], totalDuplicatesCount: 0, totalGroupCount: 0 };
  }

  const groupsMap = new Map<string, DuplicateGroup>();

  const normalizeStr = (val?: string): string => {
    if (!val || typeof val !== 'string') return '';
    return val.trim().toLowerCase();
  };

  const normalizePhone = (val?: string): string => {
    if (!val || typeof val !== 'string') return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length < 7) return '';
    return digits.slice(-10);
  };

  // 1. Strict Group by Email
  const emailMap = new Map<string, Lead[]>();
  leads.forEach(l => {
    const email = normalizeStr(l.email);
    if (email && email !== 'none' && email !== 'n/a' && email.includes('@')) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email)!.push(l);
    }
  });

  emailMap.forEach((matchedLeads, email) => {
    if (matchedLeads.length > 1) {
      const groupKey = `email:${email}`;
      groupsMap.set(groupKey, {
        id: groupKey,
        reason: 'Exact Email',
        matchValue: email,
        leads: matchedLeads
      });
    }
  });

  // 2. Strict Group by 10-Digit Phone
  const phoneMap = new Map<string, Lead[]>();
  leads.forEach(l => {
    const phone = normalizePhone(l.phone);
    if (phone) {
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone)!.push(l);
    }
  });

  phoneMap.forEach((matchedLeads, phoneDigits) => {
    if (matchedLeads.length > 1) {
      const groupKey = `phone:${phoneDigits}`;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: groupKey,
          reason: 'Exact Phone',
          matchValue: matchedLeads[0]?.phone || phoneDigits,
          leads: matchedLeads
        });
      }
    }
  });

  // 3. Strict Composite Match: Company Name AND Contact Person
  const compositeMap = new Map<string, Lead[]>();
  leads.forEach(l => {
    const company = normalizeStr(l.company_name);
    const contact = normalizeStr(l.contact_person);
    
    // Only group if BOTH company and contact match explicitly
    if (company && contact && company.length >= 2 && contact.length >= 2 && company !== 'none' && contact !== 'none') {
      const compositeKey = `${company}||${contact}`;
      if (!compositeMap.has(compositeKey)) compositeMap.set(compositeKey, []);
      compositeMap.get(compositeKey)!.push(l);
    }
  });

  compositeMap.forEach((matchedLeads, compositeKey) => {
    if (matchedLeads.length > 1) {
      const groupKey = `composite:${compositeKey}`;
      if (!groupsMap.has(groupKey)) {
        const [comp, cont] = compositeKey.split('||');
        groupsMap.set(groupKey, {
          id: groupKey,
          reason: 'Company & Contact Match',
          matchValue: `${matchedLeads[0]?.company_name || comp} (${matchedLeads[0]?.contact_person || cont})`,
          leads: matchedLeads
        });
      }
    }
  });

  const groups = Array.from(groupsMap.values());
  const duplicateLeadIds = new Set<string>();
  groups.forEach(g => g.leads.forEach(l => duplicateLeadIds.add(l.id)));

  return {
    groups,
    totalDuplicatesCount: duplicateLeadIds.size,
    totalGroupCount: groups.length
  };
}
