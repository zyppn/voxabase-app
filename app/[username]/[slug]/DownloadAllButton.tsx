'use client'
import { useState } from 'react'

export default function DownloadAllButton({ portalId, portalName }: { portalId: string; portalName: string }) {
  const [downloading, setDownloading] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleDownloadAll = async () => {
    setDownloading(true)
    setFailed(false)
    try {
      const response = await fetch(`/api/download-all?portalId=${portalId}`)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${portalName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-files.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setFailed(true)
    }
    setDownloading(false)
  }

  return (
    <div className="px-3 pt-2">
      <button
        type="button"
        onClick={handleDownloadAll}
        disabled={downloading}
        aria-busy={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-rule py-2.5 text-[13px] font-semibold text-muted transition-colors hover:border-rule-3 hover:text-paper disabled:cursor-progress disabled:opacity-60"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {downloading ? 'Preparing zip...' : 'Download all'}
      </button>
      {failed && <p role="alert" className="mt-2 text-center text-xs text-red-400">The zip could not be created. Download the files one at a time, or try again.</p>}
    </div>
  )
}
