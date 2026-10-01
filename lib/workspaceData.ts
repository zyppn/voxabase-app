// Everything the signed-in app shows for the current workspace: who you are,
// which workspaces you can switch to, the workspace's portals and the sidebar's
// numbers. The (app) layout loads it on the server for the first paint; after
// that the browser refreshes it with these same functions (switching
// workspaces, live updates), so pages never reload to pick up changes.
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasTeams, loadWorkspace, type Workspace } from '@/lib/workspace'
import { teamName } from '@/lib/people'

/** A Team workspace you can switch into: your own (Agency) or one you joined */
export type Team = { owner_id: string; owner_label: string | null; owner_username: string | null }

export type RosterRow = {
  member_id: string | null; email: string; status: 'pending' | 'active'; is_owner: boolean
  business_name: string | null; full_name: string | null; last_seen_at: string | null
}

export interface WorkspacePortal {
  id: string
  name: string
  slug: string
  owner_username: string | null
  invoice_amount: number | null
  invoice_paid: boolean
  created_at?: string | null
  starred?: boolean | null
  files_ready?: boolean | null
  password_protected?: boolean | null
  approval_required?: boolean | null
  approval_status?: 'approved' | 'changes_requested' | null
  team_shared?: boolean | null
}

export type ViewStats = Record<string, { count: number; lastViewed: string | null }>

/** The parts that change while you work: portals and who's online */
export interface LiveData {
  portals: WorkspacePortal[]
  roster: RosterRow[]
}

export interface WorkspaceData extends LiveData {
  user: { id: string; email: string }
  ws: Workspace
  /** The Team workspace you're in (its owner's id), or null for Personal */
  wsId: string | null
  /** Your own Team workspace first (Agency), then teams you've joined */
  teams: Team[]
  views: ViewStats
  usedBytes: number
  hasFiles: boolean
  /** Live white-label domain (Agency): portal links use it */
  liveDomain: string | null
}

export async function loadLive(supabase: SupabaseClient, ws: Workspace): Promise<LiveData> {
  let q = supabase.from('portals').select('*').eq('user_id', ws.ownerId)
  // Agency owners: Team workspace shows shared portals, Personal the rest
  if (ws.shared !== null) q = q.eq('team_shared', ws.shared)
  const [{ data: portals }, { data: roster }] = await Promise.all([
    q.order('created_at', { ascending: false }),
    ws.shared ? supabase.rpc('team_roster', { p_owner: ws.ownerId }) : Promise.resolve({ data: [] }),
  ])
  return { portals: (portals || []) as WorkspacePortal[], roster: (roster || []) as RosterRow[] }
}

async function loadTeams(supabase: SupabaseClient, user: WorkspaceData['user'], me: Workspace['me']): Promise<Team[]> {
  const { data } = await supabase.from('team_members').select('owner_id, owner_label, owner_username')
    .eq('member_id', user.id).eq('status', 'active')
  const joined = (data || []) as Team[]
  // owner_label is a snapshot from the invite, so prefer the owner's current
  // name where their profile is readable
  const { data: owners } = joined.length
    ? await supabase.from('profiles').select('id, business_name, full_name, username').in('id', joined.map(t => t.owner_id))
    : { data: [] }
  const own: Team[] = hasTeams(me?.plan) ? [{ owner_id: user.id, owner_label: teamName({ ...me, email: user.email }), owner_username: me?.username ?? null }] : []
  return [...own, ...joined.map(t => {
    const o = owners?.find(p => p.id === t.owner_id)
    return o ? { ...t, owner_label: teamName(o) } : t
  })]
}

async function loadViews(supabase: SupabaseClient, portalIds: string[]): Promise<ViewStats> {
  if (!portalIds.length) return {}
  const { data } = await supabase.from('portal_views').select('portal_id, viewed_at').in('portal_id', portalIds)
  const views: ViewStats = {}
  for (const v of data || []) {
    const s = (views[v.portal_id] ||= { count: 0, lastViewed: null })
    s.count++
    if (!s.lastViewed || v.viewed_at > s.lastViewed) s.lastViewed = v.viewed_at
  }
  return views
}

/** `preferred` is the Team workspace asked for (the cookie); it falls back to Personal if it isn't allowed. */
export async function loadWorkspaceData(supabase: SupabaseClient, user: WorkspaceData['user'], preferred: string | null): Promise<WorkspaceData> {
  const ws = await loadWorkspace(supabase, user.id, preferred)
  const [teams, live, { data: storage }, { count: fileCount }, { data: domain }] = await Promise.all([
    loadTeams(supabase, user, ws.me),
    loadLive(supabase, ws),
    supabase.rpc('get_user_storage_bytes', { user_uuid: ws.ownerId }),
    supabase.from('files').select('id', { count: 'exact', head: true }).eq('user_id', ws.ownerId),
    ws.owner?.plan === 'agency'
      ? supabase.from('custom_domains').select('domain').eq('owner_id', ws.ownerId).eq('verified', true).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return {
    user, ws, teams, ...live,
    wsId: ws.shared ? ws.ownerId : null,
    views: await loadViews(supabase, live.portals.map(p => p.id)),
    usedBytes: (storage as number | null) || 0,
    hasFiles: (fileCount || 0) > 0,
    liveDomain: (domain as { domain: string } | null)?.domain ?? null,
  }
}
