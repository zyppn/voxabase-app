// Workspaces. Everyone has a Personal one. An Agency owner also has a Team one,
// and teammates can switch into their owner's Team. Both of an owner's
// workspaces hold that owner's portals: shared ones (team_shared) are Team,
// the rest Personal. The choice lives in a cookie (the Team owner's id, or
// empty for Personal) so server and client pages agree.
// Access itself is enforced by the database (see supabase/migrations/*_team_seats.sql);
// this only decides whose data a page shows.
import type { SupabaseClient } from '@supabase/supabase-js'

export const WS_COOKIE = 'vb_ws'
/** Teammates an Agency owner can invite (the owner is the fifth seat). */
export const TEAM_SEATS = 4

export const PROFILE_FIELDS = 'id, username, full_name, business_name, plan, stripe_onboarding_complete'

export interface WorkspaceProfile {
  id: string
  username: string | null
  full_name: string | null
  business_name: string | null
  plan: string | null
  stripe_onboarding_complete: boolean | null
}

export interface Workspace {
  /** Whose portals, files and plan this page works with. */
  ownerId: string
  isOwner: boolean
  /** true: Team workspace, false: Personal of an Agency owner, null: no split (not on Agency) */
  shared: boolean | null
  owner: WorkspaceProfile | null
  me: WorkspaceProfile | null
}

export function readWorkspaceCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`(?:^|; )${WS_COOKIE}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

export function setWorkspaceCookie(ownerId: string | null) {
  const base = `${WS_COOKIE}=${ownerId ? encodeURIComponent(ownerId) : ''}; path=/; samesite=lax; max-age=${ownerId ? 60 * 60 * 24 * 365 : 0}`
  document.cookie = location.protocol === 'https:' ? `${base}; secure` : base
}

/**
 * Resolve the workspace for this user. `preferred` is the cookie value; it is
 * only honored if the user is an active teammate of that owner and the owner
 * is still on Agency (otherwise the owner's profile isn't readable).
 */
export async function loadWorkspace(supabase: SupabaseClient, userId: string, preferred: string | null | undefined): Promise<Workspace> {
  const { data: me } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).single()
  const iAmAgency = me?.plan === 'agency'
  if (preferred === userId && iAmAgency) return { ownerId: userId, isOwner: true, shared: true, owner: me, me }
  if (preferred && preferred !== userId) {
    const { data: membership } = await supabase
      .from('team_members')
      .select('owner_id')
      .eq('member_id', userId)
      .eq('owner_id', preferred)
      .eq('status', 'active')
      .maybeSingle()
    if (membership) {
      const { data: owner } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', preferred).maybeSingle()
      if (owner && owner.plan === 'agency') return { ownerId: preferred, isOwner: false, shared: true, owner, me }
    }
  }
  return { ownerId: userId, isOwner: true, shared: iAmAgency ? false : null, owner: me, me }
}
