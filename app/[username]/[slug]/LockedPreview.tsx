'use client'
// Before payment: a closer look at a locked file's watermarked preview, with
// the way to unlock it. ← / → move between previews, Esc closes.
import { useEffect } from 'react'
import { textOnBrand } from '@/lib/brand'

export interface LockedPreviewFile {
  id: string
  name: string
}

export default function LockedPreview({ files, index, onIndex, onClose, brandColor, unlockLabel }: {
  files: LockedPreviewFile[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  brandColor: string
  /** e.g. "Pay $1,500.00 to unlock"; leads to the invoice */
  unlockLabel?: string
}) {
  const file = files[index]
  const prev = index > 0 ? index - 1 : null
  const next = index < files.length - 1 ? index + 1 : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && prev !== null) onIndex(prev)
      else if (e.key === 'ArrowRight' && next !== null) onIndex(next)
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [prev, next, onIndex, onClose])

  const unlock = () => {
    onClose()
    const invoice = document.getElementById('invoice')
    invoice?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    invoice?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }

  const iconBtn = 'w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-paper hover:bg-ink-3 disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`}
      className="scheme-dark fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-rule bg-ink-2 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-paper truncate">{file.name}</p>
          <p className="text-[11px] text-faint">Preview{files.length > 1 ? ` · ${index + 1} of ${files.length}` : ''}</p>
        </div>
        <button onClick={() => prev !== null && onIndex(prev)} disabled={prev === null} aria-label="Previous preview" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => next !== null && onIndex(next)} disabled={next === null} aria-label="Next preview" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={onClose} aria-label="Close preview" className={iconBtn}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the portal after its access check */}
        <img key={file.id} src={`/api/file/${file.id}?preview=1`} alt={`Watermarked preview of ${file.name}`} draggable={false}
          className="max-w-full max-h-full min-w-[min(100%,420px)] object-contain rounded-lg shadow-2xl select-none" onContextMenu={(e) => e.preventDefault()} />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4 py-4 border-t border-rule bg-ink-2 flex-shrink-0 text-center">
        <p className="flex items-center gap-2 text-xs text-muted">
          <svg className="h-3.5 w-3.5 flex-none text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          A watermarked preview. The full-quality file unlocks after payment.
        </p>
        {unlockLabel && (
          <button onClick={unlock} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg"
            style={{ background: brandColor, color: textOnBrand(brandColor) }}>
            {unlockLabel}
          </button>
        )}
      </div>
    </div>
  )
}
