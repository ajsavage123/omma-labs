import { describe, it, expect } from 'vitest';
import { findDuplicateLeads } from '../crmDuplicateFinder';

describe('crmDuplicateFinder', () => {
  it('returns empty result when no leads or fewer than 2 leads provided', () => {
    expect(findDuplicateLeads([])).toEqual({ groups: [], totalDuplicatesCount: 0, totalGroupCount: 0 });
    expect(findDuplicateLeads([{ id: '1', company_name: 'Acme' }])).toEqual({ groups: [], totalDuplicatesCount: 0, totalGroupCount: 0 });
  });

  it('detects duplicates matching exact email address', () => {
    const leads = [
      { id: '1', contact_person: 'John Doe', email: 'john@acme.com', company_name: 'Acme Corp' },
      { id: '2', contact_person: 'Johnny D', email: 'JOHN@ACME.COM', company_name: 'Acme Inc' },
      { id: '3', contact_person: 'Jane Smith', email: 'jane@other.com', company_name: 'Other Corp' }
    ];

    const result = findDuplicateLeads(leads);
    expect(result.totalGroupCount).toBe(1);
    const emailGroup = result.groups.find(g => g.reason === 'Exact Email');
    expect(emailGroup).toBeDefined();
    expect(emailGroup?.leads.length).toBe(2);
    expect(emailGroup?.leads.map(l => l.id)).toEqual(['1', '2']);
  });

  it('detects duplicates matching exact phone numbers', () => {
    const leads = [
      { id: '1', contact_person: 'Alice', phone: '+1 (555) 000-1111' },
      { id: '2', contact_person: 'Alice Smith', phone: '5550001111' }
    ];

    const result = findDuplicateLeads(leads);
    const phoneGroup = result.groups.find(g => g.reason === 'Exact Phone');
    expect(phoneGroup).toBeDefined();
    expect(phoneGroup?.leads.length).toBe(2);
  });

  it('detects duplicates matching BOTH company name and contact person', () => {
    const leads = [
      { id: '1', company_name: 'Apex Industries', contact_person: 'Robert Smith' },
      { id: '2', company_name: 'apex industries', contact_person: 'robert smith' }
    ];

    const result = findDuplicateLeads(leads);
    const compositeGroup = result.groups.find(g => g.reason === 'Company & Contact Match');
    expect(compositeGroup).toBeDefined();
    expect(compositeGroup?.leads.length).toBe(2);
  });

  it('does NOT flag leads as duplicates if only company name matches but contact/email/phone are different', () => {
    const leads = [
      { id: '1', company_name: 'Global Tech', contact_person: 'Alice White', email: 'alice@gt.com', phone: '1112223333' },
      { id: '2', company_name: 'Global Tech', contact_person: 'Bob Black', email: 'bob@gt.com', phone: '4445556666' }
    ];

    const result = findDuplicateLeads(leads);
    expect(result.totalGroupCount).toBe(0);
    expect(result.totalDuplicatesCount).toBe(0);
  });
});
