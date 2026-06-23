'use client'
import { useState } from 'react'

interface FileRecord {
  id: string
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
}

interface FilesListProps {
  files: FileRecord[]
  supabaseUrl: string
  showLimit?: number
}

function formatSize(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileRow({ file, supabaseUrl }: { file: FileRecord; supabaseUrl: string }) {
  const ext = file.file_type?.split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'
  const size = formatSize(file.file_size)
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/deliverables/${file.file_path}`

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-[#0d0d10] transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 bg-[#1a0d30] border border-[#8b3cf7]/25 rounded-lg flex items-center justify-center text-xs font-bold text-[#8b3cf7] flex-shrink-0">
          {ext}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.name}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {size}{size ? ' · ' : ''}Updated today
          </p>
        </div>
      </div>
      <a
        href={downloadUrl}
        download={file.name}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#8b3cf7] hover:text-white border border-[#8b3cf7]/30 hover:border-[#8b3cf7] hover:bg-[#8b3cf7]/10 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ml-4"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </a>
    </div>
  )
}

export default function FilesList({ files, supabaseUrl, showLimit = 5 }: FilesListProps) {
  const [showAll, setShowAll] = useState(false)
  const visibleFiles = showAll ? files : files.slice(0, showLimit)
  const hiddenCount = files.length - showLimit

  return (
    <>
      <div className="divide-y divide-[#1e1e24]">
        {visibleFiles.map((file) => (
          <FileRow key={file.id} file={file} supabaseUrl={supabaseUrl} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <div className="px-6 py-3 border-t border-[#1e1e24]">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#8b3cf7] hover:text-white font-semibold transition-colors"
          >
            {showAll
              ? 'Show less'
              : `Show ${hiddenCount} more file${hiddenCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </>
  )
}
