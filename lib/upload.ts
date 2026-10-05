// Uploads one file for a portal (browser side). The server checks the file
// fits and hands back a signed link; the file goes straight to storage (B2),
// then the server confirms it arrived and adds it to the portal.
import { hasThumbnail } from '@/lib/files'
import { makeLockedPreview, previewable } from '@/lib/preview'

export type UploadOutcome =
  | { ok: true }
  /** B2 isn't set up: upload to Supabase Storage as before */
  | { ok: false; reason: 'use_supabase' }
  | { ok: false; reason: 'too_large'; maxBytes: number }
  | { ok: false; reason: 'plan_full' | 'cap_full' }
  | { ok: false; reason: 'failed'; message: string }

export async function uploadFile(portalId: string, file: File, opts: {
  replaceId?: string
  onProgress?: (fraction: number) => void
  /** The business name written across the locked preview */
  watermark?: string
} = {}): Promise<UploadOutcome> {
  const res = await fetch('/api/files/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ portalId, name: file.name, size: file.size, type: file.type }),
  }).catch(() => null)
  if (!res) return { ok: false, reason: 'failed', message: 'Check your connection and try again.' }
  const start = await res.json().catch(() => ({}))
  if (res.ok && start.provider === 'supabase') return { ok: false, reason: 'use_supabase' }
  if (start.error === 'too_large') return { ok: false, reason: 'too_large', maxBytes: start.maxBytes }
  if (start.error === 'plan_full' || start.error === 'cap_full') return { ok: false, reason: start.error }
  if (!res.ok || !start.url) return { ok: false, reason: 'failed', message: start.error || 'Couldn’t start the upload.' }

  // XMLHttpRequest rather than fetch: it reports upload progress
  const sent = await new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', start.url)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total) }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300)
    xhr.onerror = () => resolve(false)
    xhr.send(file)
  })
  if (!sent) return { ok: false, reason: 'failed', message: 'The upload was interrupted. Check your connection and try again.' }

  const [thumb, preview] = await Promise.all([
    hasThumbnail({ file_type: file.type }) ? makeThumb(file) : null,
    previewable({ name: file.name, file_type: file.type }) ? makeLockedPreview(file, file.type, opts.watermark || '') : null,
  ])
  const done = await fetch('/api/files/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: start.key, name: file.name, type: file.type, thumb, preview, replaceId: opts.replaceId }),
  }).catch(() => null)
  if (!done) return { ok: false, reason: 'failed', message: 'Check your connection and try again.' }
  if (!done.ok) {
    const j = await done.json().catch(() => ({}))
    return { ok: false, reason: 'failed', message: j.error || 'Couldn’t save the file.' }
  }
  return { ok: true }
}

/** Tells the server to clear out stored copies of deleted files. */
export function sweepDeleted() {
  fetch('/api/files/sweep', { method: 'POST', keepalive: true }).catch(() => {})
}

// A 96px square preview (cropped to fill), as a small data URL
async function makeThumb(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = 96
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const scale = Math.max(size / bitmap.width, size / bitmap.height)
    const w = bitmap.width * scale, h = bitmap.height * scale
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
    bitmap.close()
    const webp = canvas.toDataURL('image/webp', 0.8)
    // Safari can't make WebP and hands back PNG instead, which is fine too
    return webp.length < 60_000 ? webp : canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    return null
  }
}
