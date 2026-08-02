import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/)
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)

const supabaseUrl = urlMatch ? urlMatch[1].trim() : ''
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testInsert() {
  // 1. Fetch leads
  console.log('Fetching leads...')
  const { data: leads, error: leadErr } = await supabase.from('crm_leads').select('*').limit(1)
  if (leadErr) {
    console.error('Error fetching leads:', leadErr)
    return;
  }
  if (!leads || leads.length === 0) {
    console.log('No leads found to test insert with!')
    return;
  }

  const targetLead = leads[0];
  console.log('Target lead:', targetLead.id, targetLead.company_name)

  // 2. Try inserting note
  console.log('Inserting test activity note...')
  const { data: insertRes, error: insertErr } = await supabase.from('crm_activities').insert([{
    lead_id: targetLead.id,
    activity_type: 'note',
    description: '📞 TEST CALL INTERACTION LOG\n• Discussion Points: Test'
  }]).select()

  console.log('Insert result:', { data: insertRes, error: insertErr })
}

testInsert()
