import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hpiivbtvargbmdybqlsg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwaWl2YnR2YXJnYm1keWJxbHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzcyMTUsImV4cCI6MjEwMjIxMzIxNX0.iQywpEsYFE6hExd5uF9uKS9EXllxPqCb8K4pFqkUemo'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)