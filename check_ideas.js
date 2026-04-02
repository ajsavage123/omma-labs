
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uswknwkxdzkrkaimwqvf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkIdeas() {
  const { data, error } = await supabase.from('ideas').select('*').limit(10)
  if (error) {
    console.error('Error fetching ideas:', error)
  } else {
    console.log('Ideas in database:', JSON.stringify(data, null, 2))
  }
}

checkIdeas()
