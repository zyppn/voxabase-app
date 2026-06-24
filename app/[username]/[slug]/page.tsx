import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import DownloadAllButton from './DownloadAllButton'
import FilesList from './FilesList'
import PayInvoiceButton from './PayInvoiceButton'
import PortalTracker from './PortalTracker'
import PortalPasswordGate from './PortalPasswordGate'

export const revalidate = 0

export default async function PortalPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: portal } = await supabase
    .from('portals')
    .select('*')
    .eq('slug', slug)
    .eq('owner_username', username)
    .eq('is_active', true)
    .single()

  if (!portal) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, full_name, brand_color, logo_url, brand_display, plan')
    .eq('username', username)
    .single()

  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('portal_id', portal.id)
    .order('sort_order', { ascending: true })

  const displayName = profile?.business_name || profile?.full_name || username
  const brandColor = profile?.brand_color || '#8b3cf7'
  const logoUrl = profile?.logo_url || null
  const brandDisplay = profile?.brand_display || 'both'
  const ownerPlan = profile?.plan || 'free'
  const ownerIsPro = ownerPlan === 'pro' || ownerPlan === 'agency'
  const brandInitial = (displayName || 'V').charAt(0).toUpperCase()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isReady = portal.files_ready
  const fileCount = files?.length || 0
  const isPasswordProtected = !!portal.portal_password

  return (
    <main className="min-h-screen bg-[#08080a] text-white">
      <PortalTracker portalId={portal.id} ownerUsername={username} />

      {isPasswordProtected ? (
        <PortalPasswordGate
          portalId={portal.id}
          portalPassword={portal.portal_password}
          displayName={displayName}
          portalName={portal.name}
          portalDescription={portal.description}
          files={files || []}
          supabaseUrl={supabaseUrl}
          isReady={isReady}
          fileCount={fileCount}
          invoiceAmount={portal.invoice_amount}
          invoicePaid={portal.invoice_paid}
          username={username}
          slug={slug}
          brandColor={brandColor}
          logoUrl={logoUrl}
          brandDisplay={brandDisplay}
          displayInitial={brandInitial}
          ownerIsPro={ownerIsPro}
        />
      ) : (
        <div className="relative">
          {/* Subtle ambient brand glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-64"
            style={{ background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${brandColor}0d 0%, transparent 72%)` }}
          />

          <div className="relative max-w-2xl mx-auto px-6 py-10">
            {/* ── One unified portal card ── */}
            <div className="bg-[#101013] border border-[#1c1c22] rounded-2xl overflow-hidden">

              {/* Brand bar */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#16161a]">
                {ownerIsPro ? (
                  <div className="flex items-center gap-3">
                    {(brandDisplay === 'both' || brandDisplay === 'logo') && (
                      logoUrl ? (
                        <img src={logoUrl} alt={displayName} className="max-h-8 w-auto max-w-[160px] object-contain" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: brandColor }}>
                          <span className="text-white text-sm font-bold">{brandInitial}</span>
                        </div>
                      )
                    )}
                    {(brandDisplay === 'both' || brandDisplay === 'name') && (
                      <span className="text-base font-bold text-white tracking-tight">{displayName}</span>
                    )}
                  </div>
                ) : (
                  <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
                )}
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: isReady ? brandColor : '#facc15' }} />
                  <span className="text-xs text-gray-500 font-medium hidden sm:inline">{isReady ? 'Ready' : 'Preparing'}</span>
                </div>
              </div>

              {/* Project header */}
              <div className="px-6 pt-7 pb-5">
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2.5" style={{ color: brandColor }}>
                  Delivered by {displayName}
                </p>
                <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight leading-tight">{portal.name}</h1>
                {portal.description && (
                  <p className="text-gray-400 text-sm leading-relaxed mb-2">{portal.description}</p>
                )}
                <p className="text-xs text-gray-600">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                  {isReady && fileCount > 0 ? ' · Ready to download' : ' · In progress'}
                </p>
              </div>

              {/* Files */}
              {!isReady ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 text-sm font-medium">Files are being prepared</p>
                  <p className="text-gray-600 text-xs mt-1.5">Check back soon — everything will be here to download</p>
                </div>
              ) : !files || files.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-600 text-sm">No files uploaded yet</p>
                </div>
              ) : (
                <>
                  <FilesList files={files} supabaseUrl={supabaseUrl} showLimit={4} brandColor={brandColor} />
                  {fileCount > 1 && (
                    <div className="px-3 pb-2 pt-1">
                      <DownloadAllButton portalId={portal.id} portalName={portal.name} />
                    </div>
                  )}
                </>
              )}

              {/* Invoice — same card, directly under files */}
              {portal.invoice_amount && (
                <div className="px-6 pt-5 pb-6 mt-3 border-t border-[#16161a]">
                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-[0.1em] font-semibold mb-1.5">Invoice</p>
                      <p className="text-gray-400 text-sm">
                        {portal.invoice_paid ? 'Payment complete' : 'Payment due upon receipt'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-2xl font-bold text-white tracking-tight leading-none mb-1.5">
                        ${Number(portal.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                        {portal.invoice_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  {!portal.invoice_paid ? (
                    <PayInvoiceButton
                      portalId={portal.id}
                      portalName={portal.name}
                      amount={portal.invoice_amount}
                      username={username}
                      slug={slug}
                      brandColor={brandColor}
                    />
                  ) : (
                    <div className="w-full bg-green-400/10 border border-green-400/20 text-green-400 font-semibold py-4 rounded-xl text-center text-sm flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Payment received
                    </div>
                  )}
                  <p className="text-center text-xs text-gray-600 mt-3.5">Secure payment powered by Stripe</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-8 text-center">
              <p className="text-xs text-gray-700">
                Delivered via <span className="text-gray-500 font-medium">VoxaBase</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}