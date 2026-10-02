// File helpers shared by the client portal and the portal editor.

export interface NamedFile {
  name: string
  file_type: string | null
}

// Prefer the file name's extension (PDF, DOCX, ZIP); MIME subtypes read badly ("VND.", "X-ZI").
export function fileLabel(file: NamedFile) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : ''
  if (fromName && fromName.length <= 5) return fromName.toUpperCase()
  const fromType = file.file_type?.split('/')[1]
  if (fromType && /^[a-z0-9]{1,5}$/i.test(fromType)) return fromType.toUpperCase()
  return 'FILE'
}

// Image types Storage can resize into a preview thumbnail
const THUMB_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
export const hasThumbnail = (file: { file_type: string | null }) => !!file.file_type && THUMB_TYPES.has(file.file_type)

// Text and code files, recognized by extension: browsers often label these
// oddly (a .ts file arrives as video/mp2t, .md or .py with no type at all)
const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'ini', 'toml', 'yml', 'yaml', 'env', 'xml',
  'html', 'htm', 'css', 'scss', 'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'vue', 'svelte',
  'py', 'rb', 'php', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'hpp', 'cs', 'sh', 'sql',
])
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')
export const isTextFile = (file: NamedFile) =>
  TEXT_EXTS.has(extOf(file.name)) || !!file.file_type?.startsWith('text/') || file.file_type === 'application/json'

// Types that would run as a web page (scripts) if a browser opened them from
// this site. Opened for viewing, they're sent as plain text instead.
const ACTIVE_TYPES = new Set(['text/html', 'application/xhtml+xml', 'text/xml', 'application/xml', 'text/javascript', 'application/javascript', 'application/x-javascript'])

/** What to send a file as when it's opened for viewing (not downloaded) */
export function viewContentType(file: NamedFile): string {
  if (isTextFile(file) || ACTIVE_TYPES.has(file.file_type || '')) return 'text/plain; charset=utf-8'
  return file.file_type || 'application/octet-stream'
}

// Storage keys only allow plain ASCII letters, digits and a few symbols, so a
// name like "Screenshot 2026-10-01 at 9.41.12 PM.png" (macOS puts a special
// space before PM), "Résumé.pdf" or "photo[1].jpg" fails with "Invalid key".
// The key never reaches the client: views and downloads use the file's saved
// name. So keep a readable ASCII version of the name and drop everything else.
export function storageSafeName(name: string) {
  const dot = name.lastIndexOf('.')
  const clean = (s: string) => s
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // é → e
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  const base = clean(dot > 0 ? name.slice(0, dot) : name).slice(0, 80) || 'file'
  const ext = dot > 0 ? clean(name.slice(dot + 1)).slice(0, 10) : ''
  return ext ? `${base}.${ext}` : base
}
