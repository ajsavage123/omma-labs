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

async function check() {
  const { data: inv, error: invErr } = await supabase.from('invitations').select('*').eq('used', false).eq('role', 'admin').limit(1)
  console.log('Unused Admin Invites:', inv)

  const { data: projs, error: projsErr } = await supabase.from('projects').select('id, name').limit(5)
  console.log('Current Projects:', projs)
}

check()
