import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=')
    if (key) acc[key.trim()] = val.join('=').trim()
    return acc
  }, {})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function testPatch() {
  const { data, error } = await supabase
    .from('crm_tasks')
    .update({ status: 'Completed' })
    .eq('id', '76f341cf-0637-45db-9931-08ad35e6bcd0')
    .select('*, crm_leads(company_name, contact_person, email, phone)')
    .single();

  if (error) {
    console.error('PATCH ERROR DETAILED:', JSON.stringify(error, null, 2));
  } else {
    console.log('PATCH SUCCESS:', data);
  }
}

testPatch();
