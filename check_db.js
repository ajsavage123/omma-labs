import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uswknwkxdzkrkaimwqvf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data: inv, error: invErr } = await supabase.from('invitations').select('*').eq('used', false).eq('role', 'admin').limit(1)
  console.log('Unused Admin Invites:', inv)

  const { data: projs, error: projsErr } = await supabase.from('projects').select('id, name').limit(5)
  console.log('Current Projects:', projs)
}

check()
