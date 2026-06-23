import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, business_name, stripe_account_id, stripe_onboarding_complete')
    .eq('id', user.id)
    .single()

  const { data: portals } = await supabase
    .from('portals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch view counts for all portals
  const portalIds = portals?.map(p => p.id) || []
  const { data: views } = portalIds.length > 0
    ? await supabase
        .from('portal_views')
        .select('portal_id, viewed_at')
        .in('portal_id', portalIds)
    : { data: [] }

  // Build a map of portal_id -> { count, lastViewed }
  const viewMap: Record<string, { count: number; lastViewed: string | null }> = {}
  for (const view of views || []) {
    if (!viewMap[view.portal_id]) viewMap[view.portal_id] = { count: 0, lastViewed: null }
    viewMap[view.portal_id].count++
    if (!viewMap[view.portal_id].lastViewed || view.viewed_at > viewMap[view.portal_id].lastViewed!) {
      viewMap[view.portal_id].lastViewed = view.viewed_at
    }
  }

  const username = profile?.username || ''
  const stripeConnected = profile?.stripe_onboarding_complete === true
  const totalInvoiced = portals?.reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0
  const totalPaid = portals?.filter(p => p.invoice_paid).reduce((sum, p) => sum + (p.invoice_amount || 0), 0) || 0

  const activePortals = portals?.filter(p => !p.invoice_paid || !p.invoice_amount) || []
  const completedPortals = portals?.filter(p => p.invoice_paid && p.invoice_amount) || []

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between bg-[#090909]/80 backdrop-blur-sm sticky top-0 z-10">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm hidden md:block">{user.email}</span>
          <a href="/stripe-setup" className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${stripeConnected ? 'text-green-400 border-green-400/20 hover:border-green-400/40' : 'text-gray-400 hover:text-white border-[#1e1e24] hover:border-[#3a3a4a]'}`}>
            {stripeConnected ? '✓ Stripe connected' : 'Connect Stripe'}
          </a>
          <a href="/api/auth/signout" className="text-xs text-gray-400 hover:text-white border border-[#1e1e24] hover:border-[#3a3a4a] px-3 py-1.5 rounded-lg transition-colors">
            Sign out
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Stripe connect banner */}
        {!stripeConnected && (
          <div className="bg-[#1a0d30] border border-[#8b3cf7]/30 rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#8b3cf7]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Connect Stripe to collect payments</p>
                <p className="text-gray-400 text-xs mt-0.5">Your clients can not pay invoices until you connect your Stripe account</p>
              </div>
            </div>
            <a href="/stripe-setup" className="flex-shrink-0 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors">
              Set up payments
            </a>
          </div>
        )}

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {profile?.business_name || profile?.full_name || 'Your'} Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Your portals live at <span className="text-[#8b3cf7]">voxabase.com/{username}/</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Total Portals</p>
            <p className="text-3xl font-bold text-white">{portals?.length || 0}</p>
          </div>
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Active</p>
            <p className="text-3xl font-bold text-white">{activePortals.length}</p>
          </div>
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Total Invoiced</p>
            <p className="text-3xl font-bold text-white">${totalInvoiced.toLocaleString()}</p>
          </div>
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Total Collected</p>
            <p className="text-3xl font-bold text-green-400">${totalPaid.toLocaleString()}</p>
          </div>
        </div>

        {/* Active Portals */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Active Portals</h2>
          <a href="/dashboard/new" className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-lg shadow-purple-900/30">
            + New Portal
          </a>
        </div>

        {activePortals.length === 0 ? (
          <div className="border border-dashed border-[#1e1e24] rounded-xl p-16 text-center mb-8">
            <div className="w-16 h-16 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">No active portals</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first client portal to get started</p>
            <a href="/dashboard/new" className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
              Create your first portal
            </a>
          </div>
        ) : (
          <div className="grid gap-3 mb-10">
            {activePortals.map((portal) => (
              <a key={portal.id} href={`/dashboard/portal/${portal.id}`}
                className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5 flex items-center justify-between hover:border-[#8b3cf7]/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:border-[#8b3cf7]/50 transition-colors">
                    <svg className="w-5 h-5 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-white text-sm">{portal.name}</h2>
                    <p className="text-gray-500 text-xs mt-0.5">voxabase.com/{portal.owner_username || username}/{portal.slug}</p>
                    {viewMap[portal.id] && (
                      <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {viewMap[portal.id].count} view{viewMap[portal.id].count !== 1 ? 's' : ''}
                        {viewMap[portal.id].lastViewed && (
                          <span>· Last viewed {timeAgo(viewMap[portal.id].lastViewed)}</span>
                        )}
                      </p>
                    )}
                    {!viewMap[portal.id] && (
                      <p className="text-gray-600 text-xs mt-0.5">No views yet</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {portal.invoice_amount && <span className="text-sm text-gray-400 font-medium">${portal.invoice_amount}</span>}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : portal.invoice_amount ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#1e1e24] text-gray-500'}`}>
                    {portal.invoice_paid ? 'Paid' : portal.invoice_amount ? 'Unpaid' : 'No invoice'}
                  </span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-[#8b3cf7] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Completed / Paid Portals */}
        {completedPortals.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-400">Completed</h2>
              <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full font-semibold">
                {completedPortals.length} paid
              </span>
            </div>
            <div className="grid gap-3">
              {completedPortals.map((portal) => (
                <a key={portal.id} href={`/dashboard/portal/${portal.id}`}
                  className="bg-[#0d0d10] border border-[#1e1e24] rounded-xl p-5 flex items-center justify-between hover:border-green-400/20 transition-all group opacity-75 hover:opacity-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-400/5 border border-green-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-300 text-sm">{portal.name}</h2>
                      <p className="text-gray-600 text-xs mt-0.5">voxabase.com/{portal.owner_username || username}/{portal.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-green-400 font-semibold">${portal.invoice_amount}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-400/10 text-green-400">Paid</span>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}