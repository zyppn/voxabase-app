// Service-role client for server routes that act on behalf of people without
// (or beyond) their own row access. Never import this into client components.
import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
