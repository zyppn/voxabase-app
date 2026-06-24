'use client'
import { useState } from 'react'
import FilesList from './FilesList'
import DownloadAllButton from './DownloadAllButton'
import PayInvoiceButton from './PayInvoiceButton'

interface FileRecord {
  id: string
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  sort_order: number
}

interface Props {
  portalId: string
  portalPassword: string
  displayName: string
  portalName: string
  portalDescription: string | null
  files: FileRecord[]
  supabaseUrl: string
  isReady: boolean
  fileCount: number
  invoiceAmount: number | null
  invoicePaid: boolean
  username: string
  slug: string
  brandColor?: string
  logoUrl?: string | null
  brandDisplay?: string
  displayInitial?: string
  ownerIsPro?: boolean
}

export default function PortalPasswordGate({
  portalId, portalPassword, displayName, portalName, portalDescription,
  files, supabaseUrl, isReady, fileCount, invoiceAmount, invoicePaid,
  username, slug, brandColor = '#8b3cf7', logoUrl = null, brandDisplay = 'both', displayInitial = 'V', ownerIsPro = false
}: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === portalPassword) {
      setUnlocked(true)
    } else {
      setError('Incorrect password. Please try again.')
      setInput('')
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96"
          style={{ background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${brandColor}1f 0%, transparent 70%)` }} />
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-8">
            {ownerIsPro ? (
              <div className="flex items-center justify-center gap-2.5 mb-7">
                {(brandDisplay === 'both' || brandDisplay === 'logo') && (
                  logoUrl ? (
                    <img src={logoUrl} alt={displayName} className="h-9 w-auto max-w-[180px] object-contain" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: brandColor, boxShadow: `0 6px 20px -8px ${brandColor}` }}>
                      <span className="text-white text-sm font-bold">{displayInitial}</span>
                    </div>
                  )
                )}
                {(brandDisplay === 'both' || brandDisplay === 'name') && (
                  <span className="text-base font-bold text-white tracking-tight">{displayName}</span>
                )}
              </div>
            ) : (
              <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto mx-auto mb-7" />
            )}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `${brandColor}1a`, border: `1px solid ${brandColor}33`, boxShadow: `0 12px 40px -16px ${brandColor}` }}>
              <svg className="w-7 h-7" style={{ color: brandColor }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1.5 tracking-tight">Password protected</h1>
            <p className="text-gray-400 text-sm">This portal is private. Enter the password to continue.</p>
          </div>
          <form onSubmit={handleSubmit} className="bg-[#101013] border border-[#1c1c22] rounded-2xl p-6 flex flex-col gap-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>
            )}
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none text-sm transition-colors"
              style={{ caretColor: brandColor }}
              onFocus={(e) => (e.currentTarget.style.borderColor = brandColor)}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1c1c22')}
              placeholder="Enter portal password"
            />
            <button
              type="submit"
              className="w-full text-white font-semibold py-3 rounded-lg transition-transform hover:-translate-y-0.5 text-sm"
              style={{ background: brandColor, boxShadow: `0 12px 30px -10px ${brandColor}` }}
            >
              Unlock portal
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${brandColor}18 0%, transparent 70%)` }} />

      <div className="relative px-8 py-5 flex items-center justify-between backdrop-blur-sm">
        {ownerIsPro ? (
          <div className="flex items-center gap-2.5">
            {(brandDisplay === 'both' || brandDisplay === 'logo') && (
              logoUrl ? (
                <img src={logoUrl} alt={displayName} className="h-9 w-auto max-w-[200px] object-contain" />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: brandColor, boxShadow: `0 6px 20px -8px ${brandColor}` }}>
                  <span className="text-white text-sm font-bold">{displayInitial}</span>
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
        <div className="flex items-center gap-2 bg-[#101013] border border-[#1c1c22] rounded-full px-3 py-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'animate-pulse' : 'bg-yellow-400'}`} style={isReady ? { background: brandColor } : undefined} />
          <span className="text-xs text-gray-400 font-medium">{isReady ? 'Ready to download' : 'Files being prepared'}</span>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-14">
        <div className="mb-9">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-3" style={{ color: brandColor }}>
            Delivered by {displayName}
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[1.7rem] font-bold text-white mb-1.5 tracking-tight leading-tight">{portalName}</h1>
              {portalDescription && <p className="text-gray-400 text-sm leading-relaxed">{portalDescription}</p>}
            </div>
            {isReady && fileCount > 0 ? (
              <span className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide"
                style={{ color: brandColor, background: `${brandColor}15`, border: `1px solid ${brandColor}40` }}>
                Ready to download
              </span>
            ) : (
              <span className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 uppercase tracking-wide">
                In progress
              </span>
            )}
          </div>
          {fileCount > 0 && <p className="text-xs text-gray-600 mt-3">{fileCount} file{fileCount !== 1 ? 's' : ''} · Ready when you are</p>}
        </div>

        <div className="bg-[#101013] border border-[#1c1c22] rounded-2xl overflow-hidden mb-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
          <div className="px-6 py-4 border-b border-[#1c1c22] flex items-center justify-between">
            <h2 className="font-semibold text-xs text-gray-400 uppercase tracking-[0.1em]">Deliverables</h2>
            {isReady && fileCount > 1 && <DownloadAllButton portalId={portalId} portalName={portalName} />}
          </div>
          {!isReady ? (
            <div className="px-6 py-14 text-center">
              <div className="w-12 h-12 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm font-medium">Files are being prepared</p>
              <p className="text-gray-600 text-xs mt-1.5">Check back soon — you'll be able to download everything here</p>
            </div>
          ) : files.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-gray-600 text-sm">No files uploaded yet</p>
            </div>
          ) : (
            <FilesList files={files} supabaseUrl={supabaseUrl} showLimit={5} brandColor={brandColor} />
          )}
        </div>

        {invoiceAmount && (
          <div className="bg-[#101013] border border-[#1c1c22] rounded-2xl overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
            <div className="px-6 py-4 border-b border-[#1c1c22]">
              <h2 className="font-semibold text-xs text-gray-400 uppercase tracking-[0.1em]">Invoice</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-white font-semibold">{portalName}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{invoicePaid ? 'Payment complete' : 'Payment due upon receipt'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[1.7rem] font-bold text-white tracking-tight leading-none mb-1.5">${Number(invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${invoicePaid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                    {invoicePaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              {!invoicePaid ? (
                <PayInvoiceButton portalId={portalId} portalName={portalName} amount={invoiceAmount} username={username} slug={slug} brandColor={brandColor} />
              ) : (
                <div className="w-full bg-green-400/10 border border-green-400/20 text-green-400 font-semibold py-4 rounded-xl text-center text-sm flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Payment received
                </div>
              )}
              <p className="text-center text-xs text-gray-600 mt-4">Secure payment powered by Stripe</p>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-700">
            Delivered via <span className="text-gray-500 font-medium">VoxaBase</span>
          </p>
        </div>
      </div>
    </div>
  )
}