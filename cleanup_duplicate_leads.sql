-- ============================================================
-- CRM DUPLICATE LEADS CLEANUP SCRIPT
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- WHAT IT DOES:
--   Step 1 → Preview: Shows you all duplicate leads before deleting
--   Step 2 → Cleanup: Deletes duplicates, keeping the OLDEST record
--            (first-created = the original entry is preserved)
--   Step 3 → Verify: Confirms no duplicates remain
--
-- DUPLICATE MATCH LOGIC:
--   Two leads are considered duplicates if they share the same:
--     - workspace_id  (same tenant)
--     - company_name  (case-insensitive)
--     - phone         (if both have a phone number)
--   OR:
--     - workspace_id
--     - company_name  (case-insensitive)
--     - email         (if both have an email)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: PREVIEW — See what duplicates exist (READ ONLY)
-- Run this first to review before deleting anything.
-- ────────────────────────────────────────────────────────────
SELECT
  l.id,
  l.company_name,
  l.contact_person,
  l.email,
  l.phone,
  l.status,
  l.created_at,
  'DUPLICATE - will be deleted' AS action
FROM crm_leads l
WHERE l.id NOT IN (
  -- Keep the OLDEST (first created) record per duplicate group (by phone)
  SELECT DISTINCT ON (LOWER(company_name), phone, workspace_id) id
  FROM crm_leads
  WHERE phone IS NOT NULL AND phone <> ''
  ORDER BY LOWER(company_name), phone, workspace_id, created_at ASC
  UNION
  -- Keep the OLDEST record per duplicate group (by email)
  SELECT DISTINCT ON (LOWER(company_name), email, workspace_id) id
  FROM crm_leads
  WHERE email IS NOT NULL AND email <> ''
  ORDER BY LOWER(company_name), email, workspace_id, created_at ASC
  UNION
  -- Keep all leads that have neither phone nor email (can't deduplicate safely)
  SELECT id FROM crm_leads
  WHERE (phone IS NULL OR phone = '') AND (email IS NULL OR email = '')
)
ORDER BY l.company_name, l.created_at;


-- ────────────────────────────────────────────────────────────
-- STEP 2: CLEANUP — Delete duplicates (DESTRUCTIVE — review Step 1 first!)
-- Uncomment and run ONLY after reviewing Step 1 output.
-- ────────────────────────────────────────────────────────────
/*
DELETE FROM crm_leads
WHERE id NOT IN (
  -- Keep the OLDEST record per duplicate group (by phone)
  SELECT DISTINCT ON (LOWER(company_name), phone, workspace_id) id
  FROM crm_leads
  WHERE phone IS NOT NULL AND phone <> ''
  ORDER BY LOWER(company_name), phone, workspace_id, created_at ASC
  UNION
  -- Keep the OLDEST record per duplicate group (by email)
  SELECT DISTINCT ON (LOWER(company_name), email, workspace_id) id
  FROM crm_leads
  WHERE email IS NOT NULL AND email <> ''
  ORDER BY LOWER(company_name), email, workspace_id, created_at ASC
  UNION
  -- Keep all leads with neither phone nor email (cannot deduplicate safely)
  SELECT id FROM crm_leads
  WHERE (phone IS NULL OR phone = '') AND (email IS NULL OR email = '')
);
*/


-- ────────────────────────────────────────────────────────────
-- STEP 3: VERIFY — Confirm no duplicates remain
-- Run after Step 2 to confirm clean state.
-- ────────────────────────────────────────────────────────────
/*
SELECT
  workspace_id,
  LOWER(company_name) AS company_name_normalized,
  phone,
  email,
  COUNT(*) AS count
FROM crm_leads
WHERE phone IS NOT NULL AND phone <> ''
GROUP BY workspace_id, LOWER(company_name), phone, email
HAVING COUNT(*) > 1
ORDER BY count DESC;
-- Should return 0 rows if clean.
*/
