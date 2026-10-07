// One portal and its owner, looked up by address. Portals aren't publicly
// readable in the database; the server reads them here and each caller sends
// on only what the visitor may see. Cached so a page, its metadata and its
// preview picture share one lookup per request. Server-only.
import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const loadPortal = cache(async (username: string, slug: string) => {
  const admin = supabaseAdmin()
  // select('*') so a column that hasn't been added yet can't break every portal
  const { data: portal, error } = await admin
    .from('portals')
    .select('*')
    .eq('slug', slug)
    .eq('owner_username', username)
    .eq('is_active', true)
    .maybeSingle()
  if (error) console.error('[portal page] lookup failed', error.message)
  if (!portal) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('*') // all columns, so a newly added one (portal_style) can't break the page before its migration runs
    .eq('username', username)
    .single()
  return { portal, profile, displayName: (profile?.business_name || profile?.full_name || username) as string }
})

