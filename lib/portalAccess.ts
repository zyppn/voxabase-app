// Who may open a portal's contents (files, invoice, approvals).
// - Unprotected, active portals: anyone with the link.
// - Password-protected portals: visitors who unlocked it (a cookie holding a
//   hash of the portal id + password, so changing the password relocks it),
//   plus the owner and their Agency teammates.
// Server-only.
import { createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { hasTeams } from '@/lib/workspace'

export type PortalAccessRow = { id: string; user_id: string; is_active: boolean; password_protected: boolean }

export const unlockCookieName = (portalId: string) => `vb_unlock_${portalId}`
export const unlockToken = (portalId: string, password: string) =>
  createHash('sha256').update(`${portalId}:${password}`).digest('hex')

export function sameSecret(a: string, b: string) {
  const x = createHash('sha256').update(a).digest()
  const y = createHash('sha256').update(b).digest()
  return timingSafeEqual(x, y)
}

/** The signed-in user's id, if any (never on customer domains, which have no session). */
export async function viewerId(): Promise<string | null> {
  try {
    const supabase = createClient(await cookies())
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

/** Owner, or an active teammate of an Agency owner. */
export async function isOwnerOrTeam(admin: SupabaseClient, userId: string | null, ownerId: string) {
  if (!userId) return false
  if (userId === ownerId) return true
  const { data } = await admin
    .from('team_members').select('id').eq('owner_id', ownerId).eq('member_id', userId).eq('status', 'active').maybeSingle()
  if (!data) return false
  const { data: owner } = await admin.from('profiles').select('plan').eq('id', ownerId).single()
  return hasTeams(owner?.plan)
}

export async function storedPassword(admin: SupabaseClient, portalId: string): Promise<string | null> {
  const { data } = await admin.from('portal_passwords').select('password').eq('portal_id', portalId).maybeSingle()
  return data?.password || null
}

/** Can the current visitor see this portal's contents? */
export async function canOpenPortal(admin: SupabaseClient, portal: PortalAccessRow, viewer?: string | null): Promise<boolean> {
  if (!portal.password_protected) return portal.is_active
  const who = viewer === undefined ? await viewerId() : viewer
  if (await isOwnerOrTeam(admin, who, portal.user_id)) return true
  if (!portal.is_active) return false
  const cookie = (await cookies()).get(unlockCookieName(portal.id))?.value
  if (!cookie) return false
  const password = await storedPassword(admin, portal.id)
  return !!password && sameSecret(cookie, unlockToken(portal.id, password))
}
