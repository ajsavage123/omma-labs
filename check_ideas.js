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

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

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
