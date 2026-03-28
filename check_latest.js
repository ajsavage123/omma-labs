import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uswknwkxdzkrkaimwqvf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data: projs } = await supabase
    .from('projects')
    .select('*, project_stages(stage_name)')
    .order('created_at', { ascending: false })
    .limit(1)
  console.log('Latest Project:', JSON.stringify(projs, null, 2))
}
check()
