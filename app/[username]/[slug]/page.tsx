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
    <main className="min-h-screen bg-[#090909] text-white">
      <PortalTracker portalId={portal.id} ownerUsername={username} />

      {/* If password protected, show gate first */}
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
        <>
          <div className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between">
            {ownerIsPro ? (
              <div className="flex items-center gap-2.5">
                {(brandDisplay === 'both' || brandDisplay === 'logo') && (
                  logoUrl ? (
                    <img src={logoUrl} alt={displayName} className="h-9 w-auto max-w-[200px] object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brandColor }}>
                      <span className="text-white text-sm font-bold">{brandInitial}</span>
                    </div>
                  )
                )}
                {(brandDisplay === 'both' || brandDisplay === 'name') && (
                  <span className="text-base font-bold text-white">{displayName}</span>
                )}
              </div>
            ) : (
              <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className="text-xs text-gray-500">{isReady ? 'Ready to download' : 'Files being prepared'}</span>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: brandColor }}>
                Delivered by {displayName}
              </p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{portal.name}</h1>
                  {portal.description && (
                    <p className="text-gray-400 text-sm">{portal.description}</p>
                  )}
                </div>
                {isReady && fileCount > 0 ? (
                  <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide"
                    style={{ color: brandColor, background: `${brandColor}15`, border: `1px solid ${brandColor}50` }}>
                    Ready to download
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 uppercase tracking-wide">
                    Files being prepared
                  </span>
                )}
              </div>
              {fileCount > 0 && (
                <p className="text-xs text-gray-600 mt-2">{fileCount} file{fileCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            {/* Files */}
            <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden mb-5">
              <div className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Deliverables</h2>
                {isReady && fileCount > 1 && (
                  <DownloadAllButton portalId={portal.id} portalName={portal.name} />
                )}
              </div>

              {!isReady ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-12 h-12 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Files being prepared</p>
                  <p className="text-gray-600 text-xs mt-1">Check back soon or contact your provider for updates</p>
                </div>
              ) : !files || files.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-600 text-sm">No files uploaded yet</p>
                </div>
              ) : (
                <FilesList files={files} supabaseUrl={supabaseUrl} showLimit={5} brandColor={brandColor} />
              )}
            </div>

            {/* Invoice */}
            {portal.invoice_amount && (
              <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e1e24]">
                  <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Invoice</h2>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-white font-semibold">{portal.name}</p>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {portal.invoice_paid ? 'Payment complete' : 'Payment due upon receipt'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        ${Number(portal.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
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
                  <p className="text-center text-xs text-gray-600 mt-3">Secure payment powered by Stripe</p>
                </div>
              </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-xs text-gray-700">
                Delivered via <span className="text-gray-600">VoxaBase</span> — professional client portals
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  )
}