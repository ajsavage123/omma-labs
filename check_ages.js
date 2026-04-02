
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkOldMessages() {
  console.log('Checking message ages...')
  
  // Try to find the oldest message
  const { data: oldest, error: oldestError } = await supabase
    .from('chat_messages')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1)

  if (oldestError) {
    console.error('Error fetching oldest message:', oldestError)
    return
  }

  if (oldest && oldest.length > 0) {
    console.log('Oldest message created at:', oldest[0].created_at)
    const ageInDays = (new Date() - new Date(oldest[0].created_at)) / (1000 * 60 * 60 * 24)
    console.log(`Age: ${ageInDays.toFixed(2)} days`)
    
    if (ageInDays > 5) {
      console.log('ALERT: Found messages older than 5 days!')
      
      // Count them
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', fiveDaysAgo)
        
      if (countError) {
          console.error('Error counting:', countError)
      } else {
          console.log(`Count of messages older than 5 days: ${count}`)
      }
    } else {
      console.log('No messages older than 5 days found.')
    }
  } else {
    console.log('No messages found in chat_messages.')
  }
}

checkOldMessages()
