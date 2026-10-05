'use client'
import { useState } from 'react'

// Downloads every file as one zip. The server streams it, so the browser's
// own download (with its progress) starts right away.
export default function DownloadAllButton({ portalId }: { portalId: string; portalName: string }) {
  const [started, setStarted] = useState(false)

  return (
    <div className="px-3 pt-2">
      <a
        href={`/api/download-all?portalId=${portalId}`}
        download
        onClick={() => { setStarted(true); setTimeout(() => setStarted(false), 4000) }}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-rule py-2.5 text-[13px] font-semibold text-muted transition-colors hover:border-rule-3 hover:text-paper"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span aria-live="polite">{started ? 'Download started' : 'Download all'}</span>
      </a>
    </div>
  )
}
