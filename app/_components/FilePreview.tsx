'use client'
// View a portal's files without leaving the page: images, PDFs, video, audio
// and plain text show inline; anything else offers a download. ← / → move
// between files, Esc closes. Used by the portal editor and the client portal
// (with the owner's brand color, and nothing that says Voxabase).
import { useEffect, useState, type CSSProperties } from 'react'
import { textOnBrand } from '@/lib/brand'
import { isTextFile } from '@/lib/files'

export interface PreviewFile {
  id: string
  name: string
  file_type: string | null
  file_size: number | null
}

type Kind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'none'

export function kindOf(f: PreviewFile): Kind {
  const t = f.file_type || ''
  // Before the type checks: code files often come with odd types (.ts as video)
  if (isTextFile(f)) return 'text'
  if (t.startsWith('image/')) return 'image'
  if (t === 'application/pdf') return 'pdf'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  return 'none'
}

// Phones and tablets show only a PDF's first page inside a page, so there a
// PDF opens in the device's own reader instead
export const opensNatively = (f: PreviewFile) =>
  kindOf(f) === 'pdf' && typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// Text and code are shown as plain text here (never run as a page)
const TEXT_LIMIT = 2 * 1024 * 1024

function TextView({ file, src }: { file: PreviewFile; src: string }) {
  const [state, setState] = useState<{ id: string; text: string | null; failed: boolean }>({ id: '', text: null, failed: false })
  const tooBig = (file.file_size || 0) > TEXT_LIMIT
  useEffect(() => {
    if (tooBig) return
    let live = true
    fetch(src)
      .then(r => (r.ok ? r.text() : Promise.reject()))
      .then(text => { if (live) setState({ id: file.id, text, failed: false }) })
      .catch(() => { if (live) setState({ id: file.id, text: null, failed: true }) })
    return () => { live = false }
  }, [src, file.id, tooBig])
  const current = state.id === file.id
  if (tooBig || (current && state.failed)) {
    return (
      <div className="text-center rounded-xl border border-rule bg-ink-2 px-8 py-10 max-w-sm">
        <p className="text-paper font-medium mb-1.5">{tooBig ? 'Too large to preview' : 'Couldn’t load this file'}</p>
        <p className="text-sm text-faint">Download it to open it on your device.</p>
      </div>
    )
  }
  return (
    <div className="w-full h-full max-w-5xl rounded-lg border border-rule bg-ink-2 overflow-auto">
      {current && state.text !== null
        ? <pre className="p-5 text-[13px] leading-relaxed text-paper/90 font-mono whitespace-pre-wrap break-words">{state.text || ' '}</pre>
        : <p className="p-5 text-sm text-faint">Loading…</p>}
    </div>
  )
}

const size = (b: number | null) => !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

export default function FilePreview({ files, index, onIndex, onClose, brandColor }: {
  files: PreviewFile[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  /** The portal owner's color for the main buttons (client portal) */
  brandColor?: string
}) {
  const file = files[index]
  const kind = opensNatively(file) ? 'none' : kindOf(file)
  const isPdf = kindOf(file) === 'pdf'
  const mainBtn = 'inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg'
  const mainStyle: CSSProperties | undefined = brandColor ? { background: brandColor, color: textOnBrand(brandColor) } : undefined
  const mainCls = brandColor ? mainBtn : `${mainBtn} bg-paper hover:bg-paper-hover text-ink`
  // Opens inline (the server checks access, then hands out a short-lived link)
  const src = `/api/file/${file.id}?view=1`
  const prev = index > 0 ? index - 1 : null
  const next = index < files.length - 1 ? index + 1 : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && prev !== null) onIndex(prev)
      else if (e.key === 'ArrowRight' && next !== null) onIndex(next)
    }
    window.addEventListener('keydown', onKey)
    // The page behind shouldn't scroll while the preview is open
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [prev, next, onIndex, onClose])

  const iconBtn = 'w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-paper hover:bg-ink-3 disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div role="dialog" aria-modal="true" aria-label={`Preview of ${file.name}`}
      className="scheme-dark fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-rule bg-ink-2 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-paper truncate">{file.name}</p>
          <p className="text-[11px] text-faint">{[size(file.file_size), files.length > 1 ? `${index + 1} of ${files.length}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
        <button onClick={() => prev !== null && onIndex(prev)} disabled={prev === null} aria-label="Previous file" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => next !== null && onIndex(next)} disabled={next === null} aria-label="Next file" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <a href={src} target="_blank" rel="noopener noreferrer" aria-label="Open in a new tab" title="Open in a new tab" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
        </a>
        <a href={`/api/file/${file.id}`} download={file.name} aria-label="Download" title="Download" className={iconBtn}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        </a>
        <button onClick={onClose} aria-label="Close preview" className={iconBtn}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* The file. Clicking the dark area around it closes. */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        {kind === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link, not a static asset
          <img key={file.id} src={src} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        )}
        {kind === 'pdf' && (
          <iframe key={file.id} src={src} title={file.name} className="w-full h-full max-w-5xl rounded-lg border border-rule bg-ink-2" />
        )}
        {kind === 'text' && <TextView file={file} src={src} />}
        {kind === 'video' && <video key={file.id} src={src} controls autoPlay className="max-w-full max-h-full rounded-lg" />}
        {kind === 'audio' && (
          <div className="w-full max-w-md rounded-xl border border-rule bg-ink-2 p-6">
            <p className="text-sm text-paper font-medium truncate mb-4">{file.name}</p>
            <audio key={file.id} src={src} controls autoPlay className="w-full" />
          </div>
        )}
        {kind === 'none' && (
          <div className="text-center rounded-xl border border-rule bg-ink-2 px-8 py-10 max-w-sm">
            {isPdf ? (
              <>
                <p className="text-paper font-medium mb-1.5">Open this PDF</p>
                <p className="text-sm text-faint mb-5">It opens in your device’s PDF viewer.</p>
                <a href={src} target="_blank" rel="noopener noreferrer" className={mainCls} style={mainStyle}>Open PDF</a>
              </>
            ) : (
              <>
                <p className="text-paper font-medium mb-1.5">No preview for this file type</p>
                <p className="text-sm text-faint mb-5">Download it to open it on your device.</p>
                <a href={`/api/file/${file.id}`} download={file.name} className={mainCls} style={mainStyle}>Download</a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
