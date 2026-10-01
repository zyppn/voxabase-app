'use client'
import { useState, type CSSProperties } from 'react'
import { fileLabel, hasThumbnail, type NamedFile } from '@/lib/files'

// The square at the start of a file row: a small preview for images, otherwise
// the file type (PDF, ZIP). An image whose preview can't load falls back to its type.
// Not draggable: grabbing it drags its row, not a copy of the picture.
export default function FileThumb({ file, className, style, preview = true }: {
  file: NamedFile & { id: string }
  className: string
  style?: CSSProperties
  /** false: always the type badge (e.g. a file that's locked until payment) */
  preview?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (preview && hasThumbnail(file) && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a signed Storage link, not a static asset
      <img src={`/api/file/${file.id}?thumb=1`} alt="" loading="lazy" decoding="async" draggable={false}
        onError={() => setFailed(true)} className={`${className} object-cover`} style={style} />
    )
  }
  return <span className={className} style={style}>{fileLabel(file)}</span>
}
