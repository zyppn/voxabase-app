import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, business_name, stripe_account_id, stripe_onboarding_complete, plan')
    .eq('id', user.id)
    .single()

  const { data: portals } = await supabase
    .from('portals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const portalIds = portals?.map(p => p.id) || []
  const { data: views } = portalIds.length > 0
    ? await supabase.from('portal_views').select('portal_id, viewed_at').in('portal_id', portalIds)
    : { data: [] }

  const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: user.id })
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
  const totalInvoiced = portals?.reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0
  const totalPaid = portals?.filter(p => p.invoice_paid).reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0

  return (
    <DashboardShell
      email={user.email || ''}
      username={profile?.username || ''}
      businessName={profile?.business_name || ''}
      fullName={profile?.full_name || ''}
      plan={planKey}
      stripeConnected={profile?.stripe_onboarding_complete === true}
      portals={portals || []}
      viewMap={viewMap}
      usedBytes={usedBytes}
      totalInvoiced={totalInvoiced}
      totalPaid={totalPaid}
    />
  )
}