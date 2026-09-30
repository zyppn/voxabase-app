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
