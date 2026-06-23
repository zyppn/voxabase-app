'use client'
import { useState } from 'react'

export default function DownloadAllButton({ portalId, portalName }: { portalId: string; portalName: string }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownloadAll = async () => {
    setDownloading(true)
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
    }
    setDownloading(false)
  }

  return (
    <button
      onClick={handleDownloadAll}
      disabled={downloading}
      className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white border border-[#1e1e24] hover:border-[#3a3a4a] px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {downloading ? 'Preparing zip...' : 'Download all'}
    </button>
  )
}
