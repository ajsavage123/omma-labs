-- Migration: Add missing created_by column to crm_tasks
-- This column is referenced by the trigger_task_notification() trigger.
-- Without it, any UPDATE on crm_tasks (e.g. marking tasks as Completed) throws:
--   42703: record "new" has no field "created_by"

DO $$
BEGIN
  -- Add created_by column if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'crm_tasks'
      AND column_name  = 'created_by'
  ) THEN
    ALTER TABLE public.crm_tasks
      ADD COLUMN created_by uuid
        REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Back-fill existing rows: set created_by = assigned_to where possible,
-- falling back to NULL (safe — trigger already handles NULL gracefully).
UPDATE public.crm_tasks
SET    created_by = assigned_to
WHERE  created_by IS NULL
  AND  assigned_to IS NOT NULL;
