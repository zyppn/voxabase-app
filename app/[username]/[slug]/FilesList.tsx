'use client'
import { useState } from 'react'
import { brandInk, brandLine, brandSurface, DEFAULT_BRAND, type PortalStyle } from '@/lib/brand'
import FileThumb from '@/app/_components/FileThumb'
import FilePreview, { opensNatively } from '@/app/_components/FilePreview'
import LockedPreview from './LockedPreview'

export interface PortalFile {
  id: string
  name: string
  file_size: number | null
  file_type: string | null
  /** Has a watermarked preview to show before payment */
  has_preview?: boolean
}

interface FilesListProps {
  files: PortalFile[]
  /** Files unlock after payment: show the list without opening anything */
  locked?: boolean
  showLimit?: number
  brandColor?: string
  portalStyle?: PortalStyle
  /** Locked: the button in a preview that leads to the invoice */
  unlockLabel?: string
}

function formatSize(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileRow({ file, brandColor, portalStyle, onView, locked }: { file: PortalFile; brandColor: string; portalStyle: PortalStyle; onView: () => void; locked: boolean }) {
  const size = formatSize(file.file_size)
  // The server checks access, then hands out a short-lived download link
  const downloadUrl = `/api/file/${file.id}`

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[10px] border border-rule bg-ink px-2.5 py-[9px]">
      {locked ? (
        // Unpaid and locked: the name shows and, if there's one, a watermarked
        // preview opens; the file itself doesn't
        <>
          {file.has_preview ? (
            <>
              <button type="button" onClick={onView} aria-label={`Preview ${file.name}`} className="relative rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by the portal after its access check */}
                <img src={`/api/file/${file.id}?preview=1`} alt="" loading="lazy" decoding="async" draggable={false}
                  className="h-[38px] w-[38px] rounded-lg border object-cover" style={{ borderColor: brandLine(brandColor) }} />
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-ink-2 text-faint ring-1 ring-rule" aria-hidden="true">
                  <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                </span>
              </button>
              <button type="button" onClick={onView} title={`Preview ${file.name}`}
                className="min-w-0 truncate text-left text-sm font-medium text-paper/80 hover:underline underline-offset-2">{file.name}</button>
            </>
          ) : (
            <>
              <FileThumb file={file} preview={false}
                className="grid h-[38px] w-[38px] place-items-center rounded-lg border text-[10px] font-bold tracking-[0.04em]"
                style={{ background: brandSurface(brandColor, portalStyle), color: brandInk(brandColor, portalStyle), borderColor: brandLine(brandColor) }} />
              <span className="min-w-0 truncate text-sm font-medium text-paper/80" title={file.name}>{file.name}</span>
            </>
          )}
          <span className="hidden text-xs text-faint sm:block">{size}</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-[7px] text-xs font-semibold text-faint" title="Unlocks after payment">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Locked
          </span>
        </>
      ) : (
        <>
        {/* The thumbnail and name open the preview; Download stays the main button */}
        <button type="button" onClick={onView} aria-label={`Preview ${file.name}`} className="rounded-lg">
          <FileThumb
            file={file}
            className="grid h-[38px] w-[38px] place-items-center rounded-lg border text-[10px] font-bold tracking-[0.04em]"
            style={{ background: brandSurface(brandColor, portalStyle), color: brandInk(brandColor, portalStyle), borderColor: brandLine(brandColor) }}
          />
        </button>
        <button type="button" onClick={onView} title={`Preview ${file.name}`}
          className="min-w-0 truncate text-left text-sm font-medium text-paper hover:underline underline-offset-2">{file.name}</button>
        <span className="hidden text-xs text-faint sm:block">{size}</span>
        <a
          href={downloadUrl}
          download={file.name}
          className="inline-flex items-center gap-1.5 rounded-[7px] border border-rule-2 px-3 py-[7px] text-xs font-semibold text-paper transition-colors hover:border-rule-3 hover:bg-ink-3"
          aria-label={`Download ${file.name}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
        </>
      )}
    </li>
  )
}

export default function FilesList({ files, showLimit = 6, brandColor = DEFAULT_BRAND, portalStyle = 'dark', locked = false, unlockLabel }: FilesListProps) {
  const [showAll, setShowAll] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  // Locked: only the files with a watermarked preview open, one after another
  const previews = files.filter(f => f.has_preview)
  const [lockedIndex, setLockedIndex] = useState<number | null>(null)
  const view = (i: number) => {
    const f = files[i]
    if (locked) { if (f.has_preview) setLockedIndex(previews.indexOf(f)); return }
    if (opensNatively(f)) window.open(`/api/file/${f.id}?view=1`, '_blank', 'noopener')
    else setPreviewIndex(i)
  }
  const visibleFiles = showAll ? files : files.slice(0, showLimit)
  const hiddenCount = files.length - showLimit

  return (
    <div className="px-3">
      <ul className="grid gap-1.5">
        {visibleFiles.map((file) => (
          <FileRow key={file.id} file={file} brandColor={brandColor} portalStyle={portalStyle} locked={locked} onView={() => view(files.indexOf(file))} />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-1.5 px-1 py-1.5 text-left text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: brandInk(brandColor, portalStyle) }}
        >
          {showAll ? 'Show fewer files' : `Show ${hiddenCount} more file${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}
      {previewIndex !== null && files[previewIndex] && (
        <FilePreview files={files} index={previewIndex} onIndex={setPreviewIndex} onClose={() => setPreviewIndex(null)} brandColor={brandColor} />
      )}
      {locked && lockedIndex !== null && previews[lockedIndex] && (
        <LockedPreview files={previews} index={lockedIndex} onIndex={setLockedIndex} onClose={() => setLockedIndex(null)} brandColor={brandColor} unlockLabel={unlockLabel} />
      )}
    </div>
  )
}
