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

async function inspect() {
  console.log('Inspecting users table...')
  const { data: usersData, error: usersError } = await supabase.from('users').select('*').limit(1)
  if (usersError) {
    console.error('Error fetching from users:', usersError)
  } else {
    console.log('Users columns:', usersData.length > 0 ? Object.keys(usersData[0]) : 'No data found in users')
  }

  console.log('\nInspecting chat_messages table...')
  const { data: chatData, error: chatError } = await supabase.from('chat_messages').select('*').limit(1)
  if (chatError) {
    console.error('Error fetching from chat_messages:', chatError)
  } else {
    console.log('Chat columns:', chatData.length > 0 ? Object.keys(chatData[0]) : 'No data found in chat_messages')
  }
}

inspect()
