// Locked previews (browser side): a small, watermarked picture of a file that
// the client sees before paying. Photos are shrunk, videos give one frame and
// PDFs their first page; every preview is covered in the business's name.
// Logos and other flat graphics are also blurred: a watermark alone is easy
// to edit out of a few flat colors, and a small copy is all a logo needs.
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

// Graphics are shown smaller (and blurred)
const GRAPHIC_SIDE = 480

type Source = { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; cleanup?: () => void }

export async function makeLockedPreview(file: Blob, type: string, mark: string): Promise<string | null> {
  try {
    const src = type === 'application/pdf' ? await pdfSource(file)
      : type.startsWith('video/') ? await videoSource(file)
      : await imageSource(file)
    if (!src) return null
    try {
      const graphic = !type.startsWith('video/') && type !== 'application/pdf' && isGraphic(src)
      const side = graphic ? GRAPHIC_SIDE : MAX_SIDE
      const scale = Math.min(1, side / Math.max(src.width, src.height))
      const w = Math.max(1, Math.round(src.width * scale)), h = Math.max(1, Math.round(src.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      // Transparent images (logos) sit on white, like a page
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      if (graphic) drawBlurred(ctx, src, w, h)
      else src.draw(ctx, w, h)
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

// A logo, icon or illustration rather than a photo: see-through areas, or
// only a handful of distinct colors (photos have thousands)
function isGraphic(src: Source) {
  const n = 64
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  src.draw(ctx, n, n)
  const px = ctx.getImageData(0, 0, n, n).data
  const colors = new Set<number>()
  let clear = 0
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 250) { clear++; continue }
    colors.add(((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4))
  }
  return clear > n * n * 0.02 || colors.size < 160
}

// Shrink hard, then scale back up smoothly: the shapes and colors stay
// recognizable, the edges and detail don't (works in every browser, unlike
// the canvas blur filter)
function drawBlurred(ctx: CanvasRenderingContext2D, src: Source, w: number, h: number) {
  const tiny = document.createElement('canvas')
  const k = 28 / Math.max(w, h)
  tiny.width = Math.max(1, Math.round(w * k))
  tiny.height = Math.max(1, Math.round(h * k))
  const t = tiny.getContext('2d')
  if (!t) return src.draw(ctx, w, h)
  t.fillStyle = '#ffffff'
  t.fillRect(0, 0, tiny.width, tiny.height)
  t.imageSmoothingQuality = 'high'
  src.draw(t, tiny.width, tiny.height)
  // Two steps up looks like a soft blur rather than blocks
  const mid = document.createElement('canvas')
  mid.width = tiny.width * 4
  mid.height = tiny.height * 4
  const m = mid.getContext('2d')
  if (!m) return src.draw(ctx, w, h)
  m.imageSmoothingQuality = 'high'
  m.drawImage(tiny, 0, 0, mid.width, mid.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mid, 0, 0, w, h)
}

// Diagonal rows of "Business name · PREVIEW" across the whole picture, in
// thin, even lettering: dark on light pictures, light on dark ones
function watermark(ctx: CanvasRenderingContext2D, w: number, h: number, mark: string) {
  const text = `${(mark || 'Preview').trim()}   ·   PREVIEW`
  const size = Math.max(11, Math.round(Math.min(w, h) / 22))
  // How light the picture is, from a sample of its pixels
  const px = ctx.getImageData(0, 0, w, h).data
  let sum = 0, n = 0
  for (let i = 0; i < px.length; i += 4 * 97) { sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; n++ }
  const light = n > 0 && sum / n > 150
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 7)
  ctx.font = `500 ${size}px system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * 0.04).toFixed(1)}px`
  ctx.shadowColor = light ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = Math.max(2, size / 4)
  ctx.fillStyle = light ? 'rgba(17, 17, 24, 0.26)' : 'rgba(255, 255, 255, 0.55)'
  const step = ctx.measureText(text).width + size * 3
  const diag = Math.hypot(w, h)
  let row = 0
  for (let y = -diag / 2; y < diag / 2; y += size * 4.2, row++) {
    // Stagger rows so the marks don't line up into one clean column
    for (let x = -diag / 2 - (row % 2) * step / 2; x < diag / 2; x += step) ctx.fillText(text, x, y)
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
