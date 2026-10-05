// Checks a locked preview sent from the browser: a JPEG data URL, small enough
// to keep in the database. Anything else is ignored.
const PREVIEW_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/
export const MAX_PREVIEW_CHARS = 260_000
export const validPreview = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_PREVIEW_CHARS && PREVIEW_RE.test(v)
