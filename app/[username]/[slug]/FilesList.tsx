'use client'
import { useState } from 'react'
import { brandInk, brandLine, brandSurface, DEFAULT_BRAND } from '@/lib/brand'
import { fileLabel } from '@/lib/files'

export interface PortalFile {
  id: string
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
}

interface FilesListProps {
  files: PortalFile[]
  supabaseUrl: string
  showLimit?: number
  brandColor?: string
}

function formatSize(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileRow({ file, supabaseUrl, brandColor }: { file: PortalFile; supabaseUrl: string; brandColor: string }) {
  const size = formatSize(file.file_size)
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/deliverables/${file.file_path}`

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[10px] border border-rule bg-ink px-2.5 py-[9px]">
      <span
        className="grid h-[38px] w-[38px] place-items-center rounded-lg border text-[10px] font-bold tracking-[0.04em]"
        style={{ background: brandSurface(brandColor), color: brandInk(brandColor), borderColor: brandLine(brandColor) }}
      >
        {fileLabel(file)}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-paper" title={file.name}>{file.name}</span>
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
    </li>
  )
}

export default function FilesList({ files, supabaseUrl, showLimit = 6, brandColor = DEFAULT_BRAND }: FilesListProps) {
  const [showAll, setShowAll] = useState(false)
  const visibleFiles = showAll ? files : files.slice(0, showLimit)
  const hiddenCount = files.length - showLimit

  return (
    <div className="px-3">
      <ul className="grid gap-1.5">
        {visibleFiles.map((file) => (
          <FileRow key={file.id} file={file} supabaseUrl={supabaseUrl} brandColor={brandColor} />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-1.5 px-1 py-1.5 text-left text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: brandInk(brandColor) }}
        >
          {showAll ? 'Show fewer files' : `Show ${hiddenCount} more file${hiddenCount !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
