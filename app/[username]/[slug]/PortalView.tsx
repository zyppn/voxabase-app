// The client-facing portal card. Shared by the open portal page and the
// password gate (after unlock), and mirrored by the sample on voxabase.com.
import DownloadAllButton from './DownloadAllButton'
import FilesList, { type PortalFile } from './FilesList'
import PayInvoiceButton from './PayInvoiceButton'
import ApprovalPanel from './ApprovalPanel'
import { brandInk, textOnBrand } from '@/lib/brand'

export interface PortalViewProps {
  portalId: string
  portalName: string
  portalDescription: string | null
  displayName: string
  brandColor: string
  logoUrl: string | null
  brandDisplay: string
  brandInitial: string
  ownerIsPro: boolean
  isReady: boolean
  files: PortalFile[]
  supabaseUrl: string
  invoiceAmount: number | null
  invoicePaid: boolean
  username: string
  slug: string
  approvalRequired?: boolean
  approvalStatus?: 'approved' | 'changes_requested' | null
  approvalNote?: string | null
  approvalName?: string | null
  approvalAt?: string | null
  /** The password the client typed, so approval requests can prove access. */
  accessPassword?: string
  /** On the owner's own domain: hide "Delivered via Voxabase". */
  whiteLabel?: boolean
}

export function PortalBrand({ ownerIsPro, brandDisplay, logoUrl, displayName, brandInitial, brandColor, centered = false }: {
  ownerIsPro: boolean; brandDisplay: string; logoUrl: string | null; displayName: string; brandInitial: string; brandColor: string; centered?: boolean
}) {
  if (!ownerIsPro) {
    return <img src="/vblogo.png" alt="Voxabase" className={`h-6 w-auto ${centered ? 'mx-auto' : ''}`} />
  }
  const showLogo = brandDisplay === 'both' || brandDisplay === 'logo'
  const showName = brandDisplay === 'both' || brandDisplay === 'name'
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${centered ? 'justify-center' : ''}`}>
      {showLogo && (logoUrl ? (
        <img src={logoUrl} alt={displayName} className="max-h-8 w-auto max-w-[160px] object-contain" />
      ) : (
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg text-[13px] font-bold" style={{ background: brandColor, color: textOnBrand(brandColor) }}>
          {brandInitial}
        </span>
      ))}
      {showName && <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-paper">{displayName}</span>}
    </div>
  )
}

export function DeliveredVia() {
  return (
    <p className="pt-5 text-center text-xs text-faint">
      <a href="https://voxabase.com/?ref=portal" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 transition-colors hover:text-paper">
        Delivered via
        <svg className="h-3.5 w-3.5" viewBox="0 0 40 40" aria-hidden="true">
          <path fill="#eeeae3" d="M3.2 7H11.2L19.2 20V33Z" />
          <path fill="#9c7de8" d="M36.8 7H28.8L20.8 20V33Z" />
        </svg>
        <span className="font-semibold text-muted">Voxabase</span>
      </a>
    </p>
  )
}

export default function PortalView(p: PortalViewProps) {
  const fileCount = p.files.length
  const amount = p.invoiceAmount ? Number(p.invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : null

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-8 sm:px-6 sm:py-14">
      <article className="overflow-hidden rounded-[14px] border border-rule bg-ink-2">
        {/* Brand bar */}
        <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          <PortalBrand {...p} />
          <span className="flex flex-none items-center gap-2 text-xs text-faint">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.isReady ? brandInk(p.brandColor) : '#facc15' }} aria-hidden="true" />
            {p.isReady ? 'Ready' : 'Preparing'}
          </span>
        </header>

        {/* Project */}
        <div className="px-5 pb-3.5 pt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: brandInk(p.brandColor) }}>
            Delivered by {p.displayName}
          </p>
          <h1 className="text-xl font-bold leading-tight tracking-[-0.02em] text-paper [font-stretch:100%]">{p.portalName}</h1>
          {p.portalDescription && <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.portalDescription}</p>}
          <p className="mt-1.5 text-xs text-faint">
            {fileCount} file{fileCount !== 1 ? 's' : ''}
            {p.isReady && fileCount > 0 ? ' · Ready to download' : ' · In progress'}
          </p>
        </div>

        {/* Files */}
        {!p.isReady ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10">
              <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-paper">Your files are being prepared</p>
            <p className="mt-1.5 text-xs text-faint">Check back soon. Everything will be here to download.</p>
          </div>
        ) : fileCount === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-faint">No files have been added yet.</p>
        ) : (
          <>
            <FilesList files={p.files} supabaseUrl={p.supabaseUrl} showLimit={4} brandColor={p.brandColor} />
            {fileCount > 1 && <DownloadAllButton portalId={p.portalId} portalName={p.portalName} />}
          </>
        )}

        {/* Client approval (Agency) */}
        {p.approvalRequired && p.isReady && fileCount > 0 && (
          <ApprovalPanel
            portalId={p.portalId}
            displayName={p.displayName}
            brandColor={p.brandColor}
            initialStatus={p.approvalStatus ?? null}
            initialNote={p.approvalNote ?? null}
            initialName={p.approvalName ?? null}
            initialAt={p.approvalAt ?? null}
            accessPassword={p.accessPassword}
          />
        )}

        {/* Invoice */}
        {amount && (
          <section className="mt-4 border-t border-rule px-5 py-[18px]" aria-label="Invoice">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Invoice</p>
                <p className="text-[13px] text-muted">{p.invoicePaid ? 'Payment complete' : 'Payment due upon receipt'}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <p className="text-2xl font-bold leading-none tracking-[-0.025em] text-paper">${amount}</p>
                <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${p.invoicePaid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                  {p.invoicePaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
            {!p.invoicePaid ? (
              <PayInvoiceButton portalId={p.portalId} portalName={p.portalName} amount={Number(p.invoiceAmount)} username={p.username} slug={p.slug} brandColor={p.brandColor} accessPassword={p.accessPassword} />
            ) : (
              <p className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-green-400/25 bg-green-400/10 text-[15px] font-semibold text-green-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Payment received
              </p>
            )}
            <p className="mt-3 text-center text-xs text-faint">Secure payment powered by Stripe</p>
          </section>
        )}
        {!amount && <div className="h-4" />}
      </article>
      {!p.whiteLabel && <DeliveredVia />}
    </div>
  )
}
