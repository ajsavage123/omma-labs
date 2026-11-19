import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // We can't query information_schema directly from anon key usually, but we can try selecting created_by
  const { data, error } = await supabase.from('crm_tasks').select('created_by').limit(1);
  if (error) {
    console.error("Column created_by might not exist:", error.message);
  } else {
    console.log("Column created_by exists!");
  }
}

checkSchema();
