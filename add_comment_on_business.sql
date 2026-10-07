-- Add comment_on_business column to public.crm_leads if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'crm_leads' 
      AND column_name = 'comment_on_business'
  ) THEN
    ALTER TABLE public.crm_leads ADD COLUMN comment_on_business text;
  END IF;
END $$;
