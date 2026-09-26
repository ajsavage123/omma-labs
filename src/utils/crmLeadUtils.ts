/**
 * Robust utilities for CRM Lead parsing, company name extraction,
 * and repairing 'Unknown Company' entries from CSV imports.
 */

// Normalized comparison key helper: strips BOM, punctuation, spaces
export function normalizeColumnKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/^\ufeff/, '') // Strip UTF-8 BOM
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Strip spaces, hyphens, underscores, brackets, colons
    .trim();
}

// Comprehensive aliases for Company / Business Name
export const COMPANY_KEY_ALIASES = [
  'company',
  'companyname',
  'company_name',
  'business',
  'businessname',
  'business_name',
  'title',               // Google Maps default export for business title
  'placename',           // Google Maps place name
  'place_name',
  'organization',
  'organizationname',
  'orgname',
  'org',
  'account',             // Salesforce / HubSpot / Zoho account name
  'accountname',
  'account_name',
  'firm',                // Indian B2B directories (Justdial, TradeIndia)
  'firmname',
  'firm_name',
  'enterprise',
  'enterprisename',
  'establishment',
  'establishmentname',
  'client',
  'clientname',
  'customer',
  'customername',
  'store',
  'storename',
  'shop',
  'shopname',
  'agency',
  'agencyname',
  'brand',
  'brandname',
  'leadname',
  'corporate',
  'corporatename',
  'corpname',
  'hospital',
  'clinic',
  'hotel',
  'restaurant',
  'column1',
  'column_1',
  'col1',
  'unnamed0',
  'unnamed_0',
  'unnamedcol0',
  'unnamed_col_0',
  'unnamedcol1',
  'unnamed_col_1',
  'field1',
  '__parsed_extra'
];

// Comprehensive aliases for Contact Person / Individual Name
export const CONTACT_PERSON_KEY_ALIASES = [
  'contactperson',
  'contact_person',
  'contactname',
  'contact_name',
  'person',
  'personname',
  'fullname',
  'full_name',
  'name',
  'firstname',
  'first_name',
  'decisionmaker',
  'decision_maker',
  'ownername',
  'owner_name',
  'founder',
  'director',
  'ceo',
  'manager',
  'lead'
];

/**
 * Smart extractor from a CSV row:
 * Distinguishes between Company Name and Contact Person,
 * strips BOM, and ensures company name is never lost.
 */
export function extractLeadCompanyAndContact(row: Record<string, any>): {
  company: string;
  contactPerson: string;
  matchedKeys: string[];
} {
  const matchedKeys: string[] = [];
  const rowEntries = Object.entries(row || {});

  const findValueByAliases = (aliases: string[]): { key: string; value: string } | null => {
    for (const [rawKey, rawVal] of rowEntries) {
      if (rawVal === undefined || rawVal === null) continue;
      const strVal = String(rawVal).trim();
      if (!strVal) continue;

      const norm = normalizeColumnKey(rawKey);
      if (aliases.includes(norm)) {
        matchedKeys.push(rawKey);
        return { key: rawKey, value: strVal };
      }
    }
    return null;
  };

  // 1. Look for explicit company column first
  const companyMatch = findValueByAliases(COMPANY_KEY_ALIASES);
  let company = companyMatch ? companyMatch.value : '';

  // 2. Look for explicit contact person column
  const contactMatch = findValueByAliases(CONTACT_PERSON_KEY_ALIASES);
  let contactPerson = contactMatch ? contactMatch.value : '';

  // 3. Fallback discovery if company is still empty
  if (!company) {
    // Check if any column contains words like "company", "business", "org", "firm", "account"
    for (const [rawKey, rawVal] of rowEntries) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      if (!strVal) continue;

      const norm = normalizeColumnKey(rawKey);
      if (
        norm.includes('company') ||
        norm.includes('business') ||
        norm.includes('organization') ||
        norm.includes('firm') ||
        norm.includes('account') ||
        norm.includes('client') ||
        norm.includes('place')
      ) {
        company = strVal;
        matchedKeys.push(rawKey);
        break;
      }
    }
  }

  // 4. Cross-pollination:
  // If we only have contactPerson (e.g. CSV with just a "Name" column), and no company:
  if (!company && contactPerson) {
    company = contactPerson;
  }
  // If we have company but no contact person:
  if (company && !contactPerson) {
    contactPerson = company;
  }

  // 4.5 Blank Header Column Check:
  // If the first column had an empty or missing header (e.g. row[""] or row[Object.keys(row)[0]])
  if (!company || company.toLowerCase() === 'unknown company') {
    const firstKey = Object.keys(row)[0];
    if (firstKey !== undefined) {
      const firstVal = String(row[firstKey] || '').trim();
      if (
        firstVal &&
        firstVal.length >= 2 &&
        !/^[0-9+.\- ]+$/.test(firstVal) &&
        !firstVal.includes('@') &&
        !firstVal.startsWith('http')
      ) {
        company = firstVal;
        if (!contactPerson || contactPerson === 'Unknown Contact') {
          contactPerson = firstVal;
        }
        matchedKeys.push(firstKey);
      }
    }
  }

  // 5. Final fallback: never return "Unknown Company" if there is ANY valid text in the row
  if (!company || company.toLowerCase() === 'unknown company') {
    for (const [rawKey, rawVal] of rowEntries) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      const norm = normalizeColumnKey(rawKey);
      
      // Skip phone, email, url, id columns
      if (
        norm.includes('email') ||
        norm.includes('phone') ||
        norm.includes('mobile') ||
        norm.includes('url') ||
        norm.includes('link') ||
        norm.includes('website') ||
        norm.includes('date') ||
        norm.includes('batch') ||
        norm.includes('id') ||
        norm.includes('price') ||
        norm.includes('value') ||
        norm.includes('budget')
      ) {
        continue;
      }

      if (strVal && strVal.length >= 2 && !/^[0-9+.\- ]+$/.test(strVal)) {
        company = strVal;
        if (!contactPerson || contactPerson === 'Unknown Contact') {
          contactPerson = strVal;
        }
        break;
      }
    }
  }

  const resolvedComp = company.trim() || 'Unknown Company';
  const resolvedCont = contactPerson.trim() || 'Unknown Contact';
  return {
    company: resolvedComp,
    contactPerson: resolvedCont,
    matchedKeys
  };
}

/**
 * Resolves the real company name for an existing lead record.
 * If lead.company_name is "Unknown Company" or empty, extracts it
 * from lead.custom_data or lead.contact_person.
 */
export function resolveLeadCompanyName(lead: any): string {
  if (!lead) return 'Unknown Company';

  const rawCompany = (lead.company_name || '').trim();
  if (rawCompany && rawCompany.toLowerCase() !== 'unknown company' && rawCompany.toLowerCase() !== 'unknown') {
    return rawCompany;
  }

  // Check custom_data from CSV import
  if (lead.custom_data && typeof lead.custom_data === 'object') {
    // 0. Check for blank or unnamed keys (from CSVs with missing first column header)
    const blankKeyVal = lead.custom_data[''] || lead.custom_data[' '] || lead.custom_data['__parsed_extra'] || lead.custom_data['Column_1'] || lead.custom_data['unnamed_0'] || lead.custom_data['unnamed_col_0'];
    if (blankKeyVal) {
      const strVal = String(blankKeyVal).trim();
      if (strVal && strVal.toLowerCase() !== 'unknown company' && strVal.toLowerCase() !== 'unknown' && !strVal.includes('@') && !strVal.startsWith('http')) {
        return strVal;
      }
    }

    // 1. Direct match on COMPANY_KEY_ALIASES
    for (const [rawKey, rawVal] of Object.entries(lead.custom_data)) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      if (!strVal || strVal.toLowerCase() === 'unknown company' || strVal.toLowerCase() === 'unknown') continue;

      const norm = normalizeColumnKey(rawKey);
      if (COMPANY_KEY_ALIASES.includes(norm)) {
        return strVal;
      }
    }

    // 2. Direct match on Name / Title columns commonly found in scraper exports
    for (const [rawKey, rawVal] of Object.entries(lead.custom_data)) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      if (!strVal || strVal.toLowerCase() === 'unknown company' || strVal.toLowerCase() === 'unknown') continue;

      const norm = normalizeColumnKey(rawKey);
      if (norm === 'name' || norm === 'fullname' || norm === 'leadname' || norm === 'clientname') {
        return strVal;
      }
    }

    // 3. Fuzzy check on custom_data keys
    for (const [rawKey, rawVal] of Object.entries(lead.custom_data)) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      if (!strVal || strVal.toLowerCase() === 'unknown company' || strVal.toLowerCase() === 'unknown') continue;

      const norm = normalizeColumnKey(rawKey);
      if (
        norm.includes('company') ||
        norm.includes('business') ||
        norm.includes('org') ||
        norm.includes('firm') ||
        norm.includes('account') ||
        norm.includes('title') ||
        norm.includes('clinic') ||
        norm.includes('hospital') ||
        norm.includes('shop') ||
        norm.includes('store') ||
        norm.includes('name')
      ) {
        return strVal;
      }
    }

    // 4. Fallback: If Name was blank in CSV, extract from Business Category + Address locality
    // e.g. "Physical therapy clinic (Malakpet)"
    const category = lead.business_type || lead.custom_data['Business Category'] || lead.custom_data['category'];
    const address = lead.custom_data['Address'] || lead.custom_data['address'] || lead.external_link;
    if (category) {
      let locality = '';
      if (typeof address === 'string' && address.includes(',')) {
        const parts = address.split(',').map((p: string) => p.trim());
        locality = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
      }
      return locality ? `${category} (${locality})` : String(category);
    }
  }

  // 5. Fallback to contact person if present and not placeholder
  const rawContact = (lead.contact_person || '').trim();
  if (rawContact && rawContact.toLowerCase() !== 'unknown contact' && rawContact.toLowerCase() !== 'unknown') {
    return rawContact;
  }

  // 6. Fallback to lead.business_type if present
  if (lead.business_type && lead.business_type.toLowerCase() !== 'unknown') {
    return lead.business_type;
  }

  return rawCompany || 'Unknown Company';
}

/**
 * Resolves the contact person for an existing lead record.
 * If lead.contact_person is "Unknown Contact" or empty, extracts it
 * from lead.custom_data or lead.company_name.
 */
export function resolveLeadContactPerson(lead: any): string {
  if (!lead) return 'Unknown Contact';

  const rawContact = (lead.contact_person || '').trim();
  if (rawContact && rawContact.toLowerCase() !== 'unknown contact') {
    return rawContact;
  }

  // Check custom_data from CSV import
  if (lead.custom_data && typeof lead.custom_data === 'object') {
    for (const [rawKey, rawVal] of Object.entries(lead.custom_data)) {
      if (!rawVal) continue;
      const strVal = String(rawVal).trim();
      if (!strVal || strVal.toLowerCase() === 'unknown contact') continue;

      const norm = normalizeColumnKey(rawKey);
      if (CONTACT_PERSON_KEY_ALIASES.includes(norm)) {
        return strVal;
      }
    }
  }

  // Fallback to resolved company name if present
  const rawCompany = resolveLeadCompanyName(lead);
  if (rawCompany && rawCompany.toLowerCase() !== 'unknown company') {
    return rawCompany;
  }

  return rawContact || 'Unknown Contact';
}
