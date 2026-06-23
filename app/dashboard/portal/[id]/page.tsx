'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import PortalDetailSkeleton from './PortalDetailSkeleton'

interface Portal {
  id: string
  name: string
  slug: string
  description: string | null
  invoice_amount: number | null
  invoice_paid: boolean
  is_active: boolean
  owner_username: string
  files_ready: boolean
  portal_password: string | null
}

interface FileRecord {
  id: string
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  created_at: string
  sort_order: number
}

export default function PortalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [portal, setPortal] = useState<Portal | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editInvoice, setEditInvoice] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [userPlan, setUserPlan] = useState('free')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingReady, setTogglingReady] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewStats, setViewStats] = useState<{ count: number; lastViewed: string | null }>({ count: 0, lastViewed: null })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      if (profileData?.plan) setUserPlan(profileData.plan)

      const { data: portalData } = await supabase.from('portals').select('*').eq('id', id).eq('user_id', user.id).single()
      if (!portalData) { router.push('/dashboard'); return }
      setPortal(portalData)
      setEditName(portalData.name)
      setEditDescription(portalData.description || '')
      setEditInvoice(portalData.invoice_amount?.toString() || '')
      setEditPassword(portalData.portal_password || '')

      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .eq('portal_id', id)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
      setFiles(filesData || [])

      const { data: viewData } = await supabase
        .from('portal_views')
        .select('viewed_at')
        .eq('portal_id', id)
      if (viewData) {
        const lastViewed = viewData.length > 0
          ? viewData.reduce((latest, v) => v.viewed_at > latest ? v.viewed_at : latest, viewData[0].viewed_at)
          : null
        setViewStats({ count: viewData.length, lastViewed })
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleToggleReady = async () => {
    if (!portal) return
    if (files.length === 0 && !portal.files_ready) return
    setTogglingReady(true)
    const newVal = !portal.files_ready
    await supabase.from('portals').update({ files_ready: newVal }).eq('id', portal.id)
    setPortal({ ...portal, files_ready: newVal })
    setTogglingReady(false)
  }

  const STORAGE_LIMITS: Record<string, number> = {
    free: 1_073_741_824,       // 1GB
    pro: 26_843_545_600,       // 25GB
    agency: 268_435_456_000,   // 250GB
  }

  const uploadFiles = async (fileList: FileList) => {
    if (!portal) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check storage limit
    const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: user.id })
    const usedBytes = storageData || 0
    const limitBytes = STORAGE_LIMITS[userPlan] || STORAGE_LIMITS.free
    const incomingBytes = Array.from(fileList).reduce((sum, f) => sum + f.size, 0)

    if (usedBytes + incomingBytes > limitBytes) {
      const usedGB = (usedBytes / 1_073_741_824).toFixed(2)
      const limitGB = (limitBytes / 1_073_741_824).toFixed(0)
      alert(`Storage limit reached. You've used ${usedGB}GB of your ${limitGB}GB limit. Upgrade your plan to upload more files.`)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxOrder = files.length > 0 ? Math.max(...files.map(f => f.sort_order || 0)) : 0
    let orderCounter = maxOrder + 1
    for (const file of Array.from(fileList)) {
      const filePath = `${user.id}/${portal.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('deliverables').upload(filePath, file)
      if (!uploadError) {
        await supabase.from('files').insert({
          portal_id: portal.id,
          user_id: user.id,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          sort_order: orderCounter++,
        })
      }
    }
    const { data: filesData } = await supabase.from('files').select('*').eq('portal_id', portal.id).eq('user_id', user.id).order('sort_order', { ascending: true })
    setFiles(filesData || [])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await uploadFiles(e.target.files)
  }

  const handleDropZone = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) await uploadFiles(e.dataTransfer.files)
  }

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !replacingId || !portal) return
    const file = e.target.files[0]
    const existingFile = files.find(f => f.id === replacingId)
    if (!existingFile) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.storage.from('deliverables').remove([existingFile.file_path])
    const newPath = `${user.id}/${portal.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('deliverables').upload(newPath, file)
    if (!uploadError) {
      await supabase.from('files').update({ name: file.name, file_path: newPath, file_size: file.size, file_type: file.type }).eq('id', replacingId)
      const { data: filesData } = await supabase.from('files').select('*').eq('portal_id', portal.id).eq('user_id', user.id).order('sort_order', { ascending: true })
      setFiles(filesData || [])
    }
    setReplacingId(null)
    setUploading(false)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from('deliverables').remove([filePath])
    await supabase.from('files').delete().eq('id', fileId)
    const newFiles = files.filter(f => f.id !== fileId)
    setFiles(newFiles)
    setDeleteFileId(null)
    if (newFiles.length === 0 && portal?.files_ready) {
      await supabase.from('portals').update({ files_ready: false }).eq('id', portal.id)
      setPortal(prev => prev ? { ...prev, files_ready: false } : prev)
    }
  }

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggingId(fileId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(fileId)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) return
    const dragIndex = files.findIndex(f => f.id === draggingId)
    const targetIndex = files.findIndex(f => f.id === targetId)
    if (dragIndex === -1 || targetIndex === -1) return
    const newFiles = [...files]
    const [removed] = newFiles.splice(dragIndex, 1)
    newFiles.splice(targetIndex, 0, removed)
    const updated = newFiles.map((f, i) => ({ ...f, sort_order: i }))
    setFiles(updated)
    setDraggingId(null)
    setDragOverId(null)
    await Promise.all(updated.map(f => supabase.from('files').update({ sort_order: f.sort_order }).eq('id', f.id)))
  }

  const handleEditSave = async () => {
    if (!portal) return
    setSaving(true)
    await supabase.from('portals').update({
      name: editName,
      description: editDescription || null,
      invoice_amount: portal.invoice_paid ? portal.invoice_amount : (editInvoice ? parseFloat(editInvoice) : null),
      portal_password: userPlan !== 'free' ? (editPassword || null) : portal.portal_password,
    }).eq('id', portal.id)
    setPortal({
      ...portal,
      name: editName,
      description: editDescription,
      invoice_amount: portal.invoice_paid ? portal.invoice_amount : (editInvoice ? parseFloat(editInvoice) : null),
      portal_password: userPlan !== 'free' ? (editPassword || null) : portal.portal_password,
    })
    setSaving(false)
    setShowEditModal(false)
  }

  const handleDeletePortal = async () => {
    if (!portal) return
    setDeleting(true)
    for (const file of files) {
      await supabase.storage.from('deliverables').remove([file.file_path])
    }
    await supabase.from('files').delete().eq('portal_id', portal.id)
    await supabase.from('portals').delete().eq('id', portal.id)
    router.push('/dashboard')
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  if (loading) return <PortalDetailSkeleton />
  if (!portal) return null

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${portal.owner_username}/${portal.slug}`
    : `voxabase.com/${portal.owner_username}/${portal.slug}`

  const canToggleReady = files.length > 0
  const isPro = userPlan === 'pro' || userPlan === 'agency'

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between sticky top-0 bg-[#090909]/80 backdrop-blur-sm z-10">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <a href="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Portal header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 mr-4">
            <h1 className="text-2xl font-bold text-white mb-1">{portal.name}</h1>
            {portal.description && <p className="text-gray-400 text-sm mb-3">{portal.description}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#8b3cf7] font-mono bg-[#1a0d30] border border-[#8b3cf7]/20 px-3 py-1 rounded-full truncate max-w-xs">
                {portalUrl}
              </span>
              <button
                onClick={(e) => {
                  navigator.clipboard.writeText(portalUrl)
                  const btn = e.currentTarget
                  btn.textContent = 'Copied!'
                  btn.style.color = '#4ade80'
                  setTimeout(() => { btn.textContent = 'Copy link'; btn.style.color = '' }, 2000)
                }}
                className="text-xs text-gray-500 hover:text-white transition-colors border border-[#1e1e24] px-2.5 py-1 rounded-full"
              >
                Copy link
              </button>
              <a href={`/${portal.owner_username}/${portal.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-white transition-colors border border-[#1e1e24] px-2.5 py-1 rounded-full">
                Preview
              </a>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs text-gray-600">
                {viewStats.count > 0
                  ? `${viewStats.count} view${viewStats.count !== 1 ? 's' : ''} · Last viewed ${timeAgo(viewStats.lastViewed)}`
                  : 'No views yet'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowEditModal(true)}
              className="text-sm text-gray-400 hover:text-white border border-[#1e1e24] hover:border-[#3a3a4a] px-3 py-1.5 rounded-lg transition-colors">
              Edit
            </button>
            <button onClick={() => setShowDeleteModal(true)}
              className="text-sm text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 px-3 py-1.5 rounded-lg transition-colors">
              Delete
            </button>
          </div>
        </div>

        {/* Files ready toggle */}
        <div className={`rounded-xl border p-5 mb-6 flex items-center justify-between transition-all ${portal.files_ready ? 'bg-green-400/5 border-green-400/20' : 'bg-[#111114] border-[#1e1e24]'}`}>
          <div>
            <p className="font-semibold text-white text-sm">{portal.files_ready ? 'Files are live' : 'Files not ready yet'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {!canToggleReady
                ? 'Upload at least one file before marking as ready'
                : portal.files_ready
                ? 'Your client can see and download all files'
                : 'Your client sees a "Files being prepared" message — flip when ready'}
            </p>
          </div>
          <button
            onClick={handleToggleReady}
            disabled={togglingReady || !canToggleReady}
            title={!canToggleReady ? 'Upload at least one file first' : ''}
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center',
              width: '48px', height: '28px', borderRadius: '9999px', flexShrink: 0, marginLeft: '16px',
              cursor: canToggleReady ? 'pointer' : 'not-allowed',
              opacity: !canToggleReady ? 0.4 : 1,
              backgroundColor: portal.files_ready ? '#4ade80' : '#3a3a4a',
              border: 'none', transition: 'background-color 0.2s',
            }}
          >
            <span style={{
              display: 'inline-block', width: '20px', height: '20px', borderRadius: '9999px',
              backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transform: portal.files_ready ? 'translateX(24px)' : 'translateX(4px)',
              transition: 'transform 0.2s',
            }} />
          </button>
        </div>

        {/* Files section */}
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">
                Files {files.length > 0 && <span className="text-gray-600 normal-case font-normal">({files.length})</span>}
              </h2>
              {files.length > 1 && <p className="text-xs text-gray-600 mt-0.5">Drag to reorder</p>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="text-xs font-semibold bg-[#8b3cf7] hover:bg-[#9d55f8] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {uploading ? 'Uploading...' : '+ Upload files'}
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
            <input ref={replaceInputRef} type="file" onChange={handleReplace} className="hidden" />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropZone}
            className={`transition-all ${isDragOver ? 'bg-[#1a0d30]/40 border-2 border-dashed border-[#8b3cf7]/50' : ''}`}
          >
            {files.length === 0 ? (
              <div className="px-6 py-16 text-center cursor-pointer hover:bg-[#1a0d30]/10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <div className="w-12 h-12 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">Click or drag files here to upload</p>
                <p className="text-gray-600 text-xs mt-1">PDFs, images, videos, zips — any file type</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e24]">
                {files.map((file) => (
                  <div key={file.id} draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragOver={(e) => handleDragOver(e, file.id)}
                    onDrop={(e) => handleDrop(e, file.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                    className={`px-6 py-4 flex items-center justify-between group transition-all cursor-grab active:cursor-grabbing ${draggingId === file.id ? 'opacity-40' : ''} ${dragOverId === file.id && draggingId !== file.id ? 'bg-[#1a0d30]/30 border-l-2 border-[#8b3cf7]' : 'hover:bg-[#0d0d10]'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-gray-600 hover:text-gray-400 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="w-9 h-9 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-lg flex items-center justify-center text-xs font-bold text-[#8b3cf7] flex-shrink-0">
                        {file.file_type?.split('/')[1]?.toUpperCase().slice(0, 4) || 'FILE'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{formatSize(file.file_size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                      <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/deliverables/${file.file_path}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-[#1e1e24] hover:border-[#3a3a4a] transition-colors">
                        View
                      </a>
                      <button onClick={() => { setReplacingId(file.id); replaceInputRef.current?.click() }}
                        className="text-xs text-gray-400 hover:text-[#8b3cf7] px-2.5 py-1.5 rounded-lg border border-[#1e1e24] hover:border-[#8b3cf7]/40 transition-colors">
                        Replace
                      </button>
                      <button onClick={() => setDeleteFileId(file.id)}
                        className="text-xs text-gray-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg border border-[#1e1e24] hover:border-red-400/30 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <div className="px-6 py-3">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="text-xs text-gray-500 hover:text-[#8b3cf7] transition-colors">
                    {uploading ? 'Uploading...' : '+ Add more files'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice section */}
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white mb-1">Invoice</h2>
              <p className="text-gray-500 text-sm">
                {portal.invoice_amount
                  ? `$${portal.invoice_amount} — ${portal.invoice_paid ? 'Paid' : 'Awaiting payment'}`
                  : 'No invoice attached'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {portal.invoice_amount && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                  {portal.invoice_paid ? 'Paid' : 'Unpaid'}
                </span>
              )}
              {!portal.invoice_paid ? (
                <button onClick={() => setShowEditModal(true)}
                  className="text-xs text-gray-400 hover:text-white border border-[#1e1e24] px-3 py-1.5 rounded-lg transition-colors">
                  {portal.invoice_amount ? 'Edit invoice' : 'Add invoice'}
                </button>
              ) : (
                <span className="text-xs text-gray-600 border border-[#1e1e24] px-3 py-1.5 rounded-lg">
                  Locked after payment
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-6">Edit portal</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Portal name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b3cf7] text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Description <span className="text-gray-600">(optional)</span></label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b3cf7] text-sm"
                  placeholder="Optional note for your client" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Invoice amount <span className="text-gray-600">(optional)</span>
                  {portal.invoice_paid && <span className="ml-2 text-xs text-yellow-400">Locked — invoice already paid</span>}
                </label>
                <div className={`flex items-center bg-[#090909] border rounded-lg px-4 py-3 focus-within:border-[#8b3cf7] ${portal.invoice_paid ? 'border-[#3a3a4a] opacity-50' : 'border-[#1e1e24]'}`}>
                  <span className="text-gray-600 text-sm mr-1">$</span>
                  <input type="number" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)}
                    disabled={portal.invoice_paid}
                    className="flex-1 bg-transparent text-white focus:outline-none text-sm disabled:cursor-not-allowed"
                    placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">
                  Portal password <span className="text-gray-600">(optional)</span>
                  {!isPro && <span className="ml-2 text-xs bg-[#1a0d30] text-[#8b3cf7] border border-[#8b3cf7]/30 px-2 py-0.5 rounded-full">Pro</span>}
                </label>
                {isPro ? (
                  <>
                    <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b3cf7] text-sm"
                      placeholder="Leave blank to remove password" />
                    <p className="text-xs text-gray-600 mt-1">Clients must enter this password to view the portal</p>
                  </>
                ) : (
                  <div className="bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 opacity-50 cursor-not-allowed flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Upgrade to Pro to enable password protection</span>
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 border border-[#1e1e24] text-gray-400 hover:text-white py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="flex-1 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete portal confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Delete this portal?</h2>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete <span className="text-white font-medium">{portal.name}</span> and all {files.length} file{files.length !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-[#1e1e24] text-gray-400 hover:text-white py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleDeletePortal} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Yes, delete portal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete file confirmation */}
      {deleteFileId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Delete this file?</h2>
            <p className="text-gray-400 text-sm mb-6">
              <span className="text-white">{files.find(f => f.id === deleteFileId)?.name}</span> will be permanently removed from this portal.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFileId(null)} className="flex-1 border border-[#1e1e24] text-gray-400 hover:text-white py-2.5 rounded-lg text-sm transition-colors">Cancel</button>
              <button
                onClick={() => { const file = files.find(f => f.id === deleteFileId); if (file) handleDeleteFile(file.id, file.file_path) }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors">
                Delete file
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}