import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'
import { WS_COOKIE, loadWorkspace } from '@/lib/workspace'
import { teamName, teamHeading } from '@/lib/people'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Your own workspace, or an Agency team you've switched into
  const ws = await loadWorkspace(supabase, user.id, cookieStore.get(WS_COOKIE)?.value)
  const profile = ws.owner

  // Team workspace: shared portals. Personal (Agency owner): the rest.
  let portalQuery = supabase.from('portals').select('*').eq('user_id', ws.ownerId)
  if (ws.shared !== null) portalQuery = portalQuery.eq('team_shared', ws.shared)
  const { data: portals } = await portalQuery.order('created_at', { ascending: false })

  const portalIds = portals?.map(p => p.id) || []
  const { data: views } = portalIds.length > 0
    ? await supabase.from('portal_views').select('portal_id, viewed_at').in('portal_id', portalIds)
    : { data: [] }

  const { count: fileCount } = await supabase
    .from('files')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ws.ownerId)

  const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: ws.ownerId })
  const usedBytes = storageData || 0

  const viewMap: Record<string, { count: number; lastViewed: string | null }> = {}
  for (const view of views || []) {
    if (!viewMap[view.portal_id]) viewMap[view.portal_id] = { count: 0, lastViewed: null }
    viewMap[view.portal_id].count++
    if (!viewMap[view.portal_id].lastViewed || view.viewed_at > viewMap[view.portal_id].lastViewed!) {
      viewMap[view.portal_id].lastViewed = view.viewed_at
    }
  }

  const planKey = (profile?.plan || 'free') as string
  // Live white-label domain (Agency) replaces the default portal address
  const { data: liveDomain } = planKey === 'agency'
    ? await supabase.from('custom_domains').select('domain').eq('owner_id', ws.ownerId).eq('verified', true).maybeSingle()
    : { data: null }
  const totalInvoiced = portals?.reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0
  const totalPaid = portals?.filter(p => p.invoice_paid).reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0

  return (
    <DashboardShell
      email={user.email || ''}
      username={profile?.username || ''}
      businessName={ws.me?.business_name || ''}
      fullName={ws.me?.full_name || ''}
      plan={planKey}
      stripeConnected={ws.me?.stripe_onboarding_complete === true}
      portals={portals || []}
      viewMap={viewMap}
      usedBytes={usedBytes}
      totalInvoiced={totalInvoiced}
      totalPaid={totalPaid}
      hasFiles={(fileCount || 0) > 0}
      portalHost={liveDomain?.domain ?? null}
      teamName={ws.shared && profile ? teamName(profile) : null}
      teamHeading={ws.shared && profile ? teamHeading(profile) : null}
      isOwner={ws.isOwner}
      personalSplit={ws.shared === false}
    />
  )
}