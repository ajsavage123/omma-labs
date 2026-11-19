import { describe, it, expect } from 'vitest';
import {
  normalizeColumnKey,
  extractLeadCompanyAndContact,
  resolveLeadCompanyName
} from '../crmLeadUtils';

describe('crmLeadUtils', () => {
  describe('normalizeColumnKey', () => {
    it('strips UTF-8 BOM, spaces, and punctuation', () => {
      expect(normalizeColumnKey('\ufeffCompany Name')).toBe('companyname');
      expect(normalizeColumnKey('Company_Name')).toBe('companyname');
      expect(normalizeColumnKey('Company-Name (Main)')).toBe('companynamemain');
      expect(normalizeColumnKey('  Business Name  ')).toBe('businessname');
    });
  });

  describe('extractLeadCompanyAndContact', () => {
    it('handles UTF-8 BOM in "Company Name" from Excel', () => {
      const row = {
        '\ufeffCompany Name': 'Apex Technologies',
        'Contact Person': 'Rahul Sharma',
        'Phone': '9876543210'
      };
      const result = extractLeadCompanyAndContact(row);
      expect(result.company).toBe('Apex Technologies');
      expect(result.contactPerson).toBe('Rahul Sharma');
    });

    it('extracts Google Maps "Business Name" and "Title"', () => {
      const rowWithBiz = {
        'Business Name': 'Metro Supermarket',
        'Phone': '9876543210'
      };
      expect(extractLeadCompanyAndContact(rowWithBiz).company).toBe('Metro Supermarket');

      const rowWithTitle = {
        'Title': 'Green Valley Dental Clinic',
        'Website': 'https://greenvalley.com'
      };
      expect(extractLeadCompanyAndContact(rowWithTitle).company).toBe('Green Valley Dental Clinic');
    });

    it('extracts Salesforce / HubSpot "Account Name" and "Organization"', () => {
      const rowAccount = {
        'Account Name': 'CloudScale Inc',
        'Full Name': 'John Doe'
      };
      const res = extractLeadCompanyAndContact(rowAccount);
      expect(res.company).toBe('CloudScale Inc');
      expect(res.contactPerson).toBe('John Doe');

      const rowOrg = {
        'Organization': 'Global Logistics Ltd'
      };
      expect(extractLeadCompanyAndContact(rowOrg).company).toBe('Global Logistics Ltd');
    });

    it('extracts Indian B2B directory "Firm Name"', () => {
      const rowFirm = {
        'Firm Name': 'Balaji Electricals',
        'Contact Person': 'Suresh Patel'
      };
      const res = extractLeadCompanyAndContact(rowFirm);
      expect(res.company).toBe('Balaji Electricals');
      expect(res.contactPerson).toBe('Suresh Patel');
    });

    it('handles single "Name" column gracefully without setting Unknown Company', () => {
      const rowSingle = {
        'Name': 'Sri Ram Hospital'
      };
      const res = extractLeadCompanyAndContact(rowSingle);
      expect(res.company).toBe('Sri Ram Hospital');
      expect(res.contactPerson).toBe('Sri Ram Hospital');
    });
  });

  describe('resolveLeadCompanyName', () => {
    it('returns company_name if already valid', () => {
      const lead = { company_name: 'Stark Industries', contact_person: 'Tony Stark' };
      expect(resolveLeadCompanyName(lead)).toBe('Stark Industries');
    });

    it('recovers real company name from custom_data when company_name is "Unknown Company"', () => {
      const lead = {
        company_name: 'Unknown Company',
        contact_person: 'Unknown Contact',
        custom_data: {
          'Business Name': 'Aditi Software Labs',
          'City': 'Bengaluru'
        }
      };
      expect(resolveLeadCompanyName(lead)).toBe('Aditi Software Labs');
    });

    it('recovers company name with BOM in custom_data key', () => {
      const lead = {
        company_name: 'Unknown Company',
        contact_person: 'Unknown Contact',
        custom_data: {
          '\ufeffCompany Name': 'Nexus Global Logistics'
        }
      };
      expect(resolveLeadCompanyName(lead)).toBe('Nexus Global Logistics');
    });

    it('falls back to contact_person if custom_data has no company info', () => {
      const lead = {
        company_name: 'Unknown Company',
        contact_person: 'Dr. Vikram Sarabhai',
        custom_data: {}
      };
      expect(resolveLeadCompanyName(lead)).toBe('Dr. Vikram Sarabhai');
    });

    it('recovers company name from blank/empty header key in custom_data', () => {
      const lead = {
        company_name: 'Unknown Company',
        contact_person: 'Unknown Contact',
        custom_data: {
          '': 'Metro Heart Institute',
          'Phone': '+91 9876543210'
        }
      };
      expect(resolveLeadCompanyName(lead)).toBe('Metro Heart Institute');
    });

    it('extracts company name when first column header is completely blank in CSV row', () => {
      const row = {
        '': 'Apollo Diagnostics & Health Center',
        'Phone': '+91 9988776655',
        'Address': 'Banjara Hills, Hyderabad'
      };
      const result = extractLeadCompanyAndContact(row);
      expect(result.company).toBe('Apollo Diagnostics & Health Center');
    });
  });
});
