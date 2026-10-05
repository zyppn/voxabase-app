// Locked previews (browser side): a small, watermarked picture of a file that
// the client sees before paying. Photos are shrunk, videos give one frame and
// PDFs their first page; every preview is covered in the business's name.
// Made in the owner's browser at upload, so the server never needs to open
// the original to build one.

/** Files that can get a locked preview */
export function previewable(file: { name: string; file_type: string | null }) {
  const t = file.file_type || ''
  return (t.startsWith('image/') && t !== 'image/svg+xml') || t.startsWith('video/') || t === 'application/pdf'
}

// The longest side of a preview: enough to judge the work, too small to use it
const MAX_SIDE = 720
const MAX_CHARS = 250_000

type Source = { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; cleanup?: () => void }

export async function makeLockedPreview(file: Blob, type: string, mark: string): Promise<string | null> {
  try {
    const src = type === 'application/pdf' ? await pdfSource(file)
      : type.startsWith('video/') ? await videoSource(file)
      : await imageSource(file)
    if (!src) return null
    try {
      const scale = Math.min(1, MAX_SIDE / Math.max(src.width, src.height))
      const w = Math.max(1, Math.round(src.width * scale)), h = Math.max(1, Math.round(src.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      // Transparent images (logos) sit on white, like a page
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      src.draw(ctx, w, h)
      watermark(ctx, w, h, mark)
      for (const q of [0.72, 0.55, 0.4]) {
        const url = canvas.toDataURL('image/jpeg', q)
        if (url.length <= MAX_CHARS) return url
      }
      return null
    } finally {
      src.cleanup?.()
    }
  } catch (e) {
    console.warn('[preview] could not make a preview', e)
    return null
  }
}

// Diagonal rows of "Business name · PREVIEW" across the whole picture
function watermark(ctx: CanvasRenderingContext2D, w: number, h: number, mark: string) {
  const text = `${(mark || 'Preview').trim()}  ·  PREVIEW`
  const size = Math.max(12, Math.round(Math.min(w, h) / 16))
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 7)
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textBaseline = 'middle'
  const step = ctx.measureText(text).width + size * 2
  const diag = Math.hypot(w, h)
  let row = 0
  for (let y = -diag / 2; y < diag / 2; y += size * 3.2, row++) {
    // Stagger rows so the marks don't line up into one clean column
    for (let x = -diag / 2 - (row % 2) * step / 2; x < diag / 2; x += step) {
      ctx.lineWidth = Math.max(1, size / 10)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)'
      ctx.strokeText(text, x, y)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()
}

function imageSource(file: Blob): Promise<Source | null> {
  // An <img> rather than createImageBitmap: it also handles HEIC on Safari
  const url = URL.createObjectURL(file)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({
      width: img.naturalWidth, height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(url),
    })
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// A frame a little way in (the very first is often black)
function videoSource(file: Blob): Promise<Source | null> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const done = (s: Source | null) => { clearTimeout(timer); if (!s) URL.revokeObjectURL(url); resolve(s) }
    const timer = setTimeout(() => done(null), 8000)
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 4)
    }
    video.onseeked = () => {
      if (!video.videoWidth) return done(null)
      done({
        width: video.videoWidth, height: video.videoHeight,
        draw: (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(url),
      })
    }
    video.onerror = () => done(null)
    video.src = url
  })
}

async function pdfSource(file: Blob): Promise<Source | null> {
  // The legacy build works in older browsers too (Safari before 18, older Chrome)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(base.width, base.height) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return { width: canvas.width, height: canvas.height, draw: (c, w, h) => c.drawImage(canvas, 0, 0, w, h) }
  } finally {
    doc.destroy()
  }
}
