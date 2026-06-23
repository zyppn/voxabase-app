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
}

export default function PortalPasswordGate({
  portalId, portalPassword, displayName, portalName, portalDescription,
  files, supabaseUrl, isReady, fileCount, invoiceAmount, invoicePaid,
  username, slug
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
      <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto mx-auto mb-6" />
            <div className="w-14 h-14 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Password protected</h1>
            <p className="text-gray-400 text-sm">This portal is private. Enter the password to continue.</p>
          </div>
          <form onSubmit={handleSubmit} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 flex flex-col gap-4">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">{error}</div>
            )}
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
              placeholder="Enter portal password"
            />
            <button
              type="submit"
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Unlock portal
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-xs text-gray-500">{isReady ? 'Ready to download' : 'Files being prepared'}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2">
            Delivered by {displayName}
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{portalName}</h1>
              {portalDescription && <p className="text-gray-400 text-sm">{portalDescription}</p>}
            </div>
            {isReady && fileCount > 0 ? (
              <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-400/30 bg-green-400/10 text-green-400 uppercase tracking-wide">
                Ready to download
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 uppercase tracking-wide">
                Files being prepared
              </span>
            )}
          </div>
          {fileCount > 0 && <p className="text-xs text-gray-600 mt-2">{fileCount} file{fileCount !== 1 ? 's' : ''}</p>}
        </div>

        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Deliverables</h2>
            {isReady && fileCount > 1 && <DownloadAllButton portalId={portalId} portalName={portalName} />}
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
          ) : files.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600 text-sm">No files uploaded yet</p>
            </div>
          ) : (
            <FilesList files={files} supabaseUrl={supabaseUrl} showLimit={5} />
          )}
        </div>

        {invoiceAmount && (
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e1e24]">
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Invoice</h2>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-white font-semibold">{portalName}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{invoicePaid ? 'Payment complete' : 'Payment due upon receipt'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">${Number(invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${invoicePaid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                    {invoicePaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
              {!invoicePaid ? (
                <PayInvoiceButton portalId={portalId} portalName={portalName} amount={invoiceAmount} username={username} slug={slug} />
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
  )
}
