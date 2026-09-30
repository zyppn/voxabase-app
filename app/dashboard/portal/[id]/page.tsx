'use client'
import { useState, useEffect, useRef } from 'react'
import { fileLabel } from '@/lib/files'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import PortalDetailSkeleton from './PortalDetailSkeleton'
import AppShell from '../../AppShell'

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
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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
  const [sidebar, setSidebar] = useState<{
    counts: { all: number; active: number; completed: number }
    usedBytes: number
    plan: string
    displayLabel: string
    email: string
    initials: string
    stripeConnected: boolean
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { id } = await params
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, full_name, business_name, stripe_onboarding_complete')
        .eq('id', user.id)
        .single()
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

      // Sidebar data: all portals (counts) + storage
      const { data: allPortals } = await supabase
        .from('portals')
        .select('invoice_amount, invoice_paid')
        .eq('user_id', user.id)
      const all = allPortals || []
      const activeCount = all.filter(p => !p.invoice_paid || !p.invoice_amount).length
      const completedCount = all.filter(p => p.invoice_paid && p.invoice_amount).length

      const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: user.id })

      const label = profileData?.business_name || profileData?.full_name || 'Your'
      const init = (() => {
        const base = profileData?.business_name || profileData?.full_name
        if (base) return base.split(' ').filter(Boolean).slice(0, 2).map((s: string) => s[0]).join('').toUpperCase()
        return (user.email?.[0] || 'U').toUpperCase()
      })()

      setSidebar({
        counts: { all: all.length, active: activeCount, completed: completedCount },
        usedBytes: storageData || 0,
        plan: profileData?.plan || 'free',
        displayLabel: label,
        email: user.email || '',
        initials: init,
        stripeConnected: profileData?.stripe_onboarding_complete === true,
      })

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

  // Per-file upload ceiling. Bump this when the Storage limit is raised.
  const MAX_FILE_MB = 50
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

  // Turn a Supabase Storage upload error into a clear, user-facing message.
  const describeUploadError = (err: unknown, fileName: string, fileSize: number): string => {
    const raw = (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err)).toLowerCase()
    const status = (err && typeof err === 'object' && 'statusCode' in err) ? String((err as { statusCode: unknown }).statusCode) : ''
    const mb = (fileSize / 1048576).toFixed(0)
    const isSize = status === '413' || raw.includes('maximum allowed size') || raw.includes('payload too large') || raw.includes('exceeded')
    if (isSize) {
      return `"${fileName}" is ${mb} MB. File size cannot exceed ${MAX_FILE_MB} MB.`
    }
    if (raw.includes('mime') || raw.includes('not allowed')) {
      return `"${fileName}" could not be uploaded — that file type is not supported.`
    }
    return `"${fileName}" failed to upload: ${(err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message) : 'unknown error'}.`
  }

  const uploadFiles = async (fileList: FileList) => {
    if (!portal) return
    setUploadError(null)
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

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
    const failures: string[] = []
    for (const file of Array.from(fileList)) {
      // Block oversized files up front so the user gets an instant, clean message.
      if (file.size > MAX_FILE_BYTES) {
        failures.push(`"${file.name}" is ${(file.size / 1048576).toFixed(0)} MB. File size cannot exceed ${MAX_FILE_MB} MB.`)
        continue
      }
      const filePath = `${user.id}/${portal.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('deliverables').upload(filePath, file)
      if (upErr) {
        failures.push(describeUploadError(upErr, file.name, file.size))
        continue
      }
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
    if (failures.length) setUploadError(failures.join(' '))
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
    // Guard before removing the old file, so an oversized replacement can't
    // leave the portal with a missing file.
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`"${file.name}" is ${(file.size / 1048576).toFixed(0)} MB. File size cannot exceed ${MAX_FILE_MB} MB.`)
      setReplacingId(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
      return
    }
    setUploadError(null)
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.storage.from('deliverables').remove([existingFile.file_path])
    const newPath = `${user.id}/${portal.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('deliverables').upload(newPath, file)
    if (!upErr) {
      await supabase.from('files').update({ name: file.name, file_path: newPath, file_size: file.size, file_type: file.type }).eq('id', replacingId)
      const { data: filesData } = await supabase.from('files').select('*').eq('portal_id', portal.id).eq('user_id', user.id).order('sort_order', { ascending: true })
      setFiles(filesData || [])
    } else {
      setUploadError(describeUploadError(upErr, file.name, file.size))
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
    <AppShell
      counts={sidebar?.counts || { all: 0, active: 0, completed: 0 }}
      usedBytes={sidebar?.usedBytes || 0}
      plan={sidebar?.plan || userPlan}
      displayLabel={sidebar?.displayLabel || 'Your'}
      email={sidebar?.email || ''}
      initials={sidebar?.initials || 'U'}
      stripeConnected={sidebar?.stripeConnected || false}
      activeFilter={null}
      onFilterClick={(key) => router.push(`/dashboard?filter=${key}`)}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        {/* Back button — clean arrow */}
        <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-faint hover:text-paper mb-6 group w-fit">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>

        {/* Portal header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-paper tracking-tight">{portal.name}</h1>
            {portal.description && <p className="text-muted text-sm mt-1">{portal.description}</p>}
          </div>
          <div className="relative flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowEditModal(true)}
              className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">
              Edit
            </button>
            <button onClick={() => setMoreOpen((o) => !o)} aria-label="More actions" aria-haspopup="menu" aria-expanded={moreOpen}
              className="text-muted hover:text-paper border border-rule-2 hover:border-rule-3 w-10 h-[38px] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            {moreOpen && (
              <>
                <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setMoreOpen(false)} />
                <div role="menu" className="absolute right-0 top-full mt-2 z-30 w-48 bg-ink-2 border border-rule-2 rounded-xl p-1.5 shadow-xl shadow-black/40">
                  <a role="menuitem" href={`/${portal.owner_username}/${portal.slug}`} target="_blank" rel="noopener noreferrer"
                    className="block text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Open client view</a>
                  <button role="menuitem" onClick={() => { setMoreOpen(false); setShowDeleteModal(true) }}
                    className="w-full text-left text-sm text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2">Delete portal</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Share: the portal's main job */}
        <div className="bg-ink-2 border border-rule rounded-xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 bg-ink border border-rule rounded-lg px-3.5 py-2.5">
              <svg className="w-4 h-4 text-faint flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span className="text-sm text-paper truncate">{portalUrl.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl)
                  try { localStorage.setItem('vb_link_copied', '1') } catch { /* ignore */ }
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-paper hover:bg-white text-ink text-sm font-semibold px-4 py-2.5 rounded-lg min-w-[118px]"
              >
                {copied ? (
                  <><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
                ) : 'Copy link'}
              </button>
              <a href={`/${portal.owner_username}/${portal.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 sm:flex-none text-center text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-4 py-2.5 rounded-lg">
                Preview
              </a>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-faint mt-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {viewStats.count > 0
              ? `Opened ${viewStats.count} time${viewStats.count !== 1 ? 's' : ''} · last ${timeAgo(viewStats.lastViewed)}`
              : 'Not opened yet'}
          </p>
        </div>

        {/* Files ready toggle */}
        <div className={`rounded-xl border p-5 mb-4 flex items-center justify-between ${portal.files_ready ? 'bg-green-400/5 border-green-400/20' : 'bg-ink-2 border-rule'}`}>
          <div>
            <p className="font-semibold text-paper text-sm">{portal.files_ready ? 'Files are live' : 'Files not ready yet'}</p>
            <p className="text-xs text-faint mt-0.5">
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
              backgroundColor: portal.files_ready ? '#4ade80' : '#4a4557',
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
        <div className="bg-ink-2 border border-rule rounded-xl overflow-hidden mb-4">
          <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-paper">
                Files {files.length > 0 && <span className="text-faint font-normal">{files.length}</span>}
              </h2>
              {files.length > 1 && <p className="text-xs text-faint mt-0.5">Drag to reorder</p>}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="text-sm font-semibold bg-paper hover:bg-white text-ink px-3.5 py-2 rounded-lg disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload files'}
            </button>
            <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
            <input ref={replaceInputRef} type="file" onChange={handleReplace} className="hidden" />
          </div>

          {uploadError && (
            <div className="mx-6 mt-4 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-7.5 12.99A1.5 1.5 0 004.14 20.25h15.72a1.5 1.5 0 001.3-2.32l-7.5-12.99a1.5 1.5 0 00-2.6 0z" />
              </svg>
              <span className="flex-1">{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="text-red-400/70 hover:text-red-300 flex-shrink-0" aria-label="Dismiss">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropZone}
            className={`${isDragOver ? 'bg-accent-soft/40' : ''}`}
          >
            {files.length === 0 ? (
              <div className="px-6 py-16 text-center cursor-pointer hover:bg-accent-soft/10" onClick={() => fileInputRef.current?.click()}>
                <div className="w-12 h-12 bg-accent-soft border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-accent-text" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-muted text-sm font-medium">Click or drag files here to upload</p>
                <p className="text-faint text-xs mt-1">PDFs, images, videos, zips — any file type</p>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {files.map((file) => (
                  <div key={file.id} draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragOver={(e) => handleDragOver(e, file.id)}
                    onDrop={(e) => handleDrop(e, file.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                    className={`px-4 sm:px-6 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 group cursor-grab active:cursor-grabbing hover:bg-ink-3/40 transition-colors ${draggingId === file.id ? 'opacity-40' : ''} ${dragOverId === file.id && draggingId !== file.id ? 'bg-accent-soft/50' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 basis-[13rem]">
                      <div className="text-faint group-hover:text-muted flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="w-9 h-9 bg-accent-soft border border-accent/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-accent-text flex-shrink-0">
                        {fileLabel(file)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-paper truncate">{file.name}</p>
                        <p className="text-xs text-faint mt-0.5">{formatSize(file.file_size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                      <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/deliverables/${file.file_path}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium text-muted hover:text-paper hover:bg-ink-3 px-2.5 py-1.5 rounded-md">
                        View
                      </a>
                      <button onClick={() => { setReplacingId(file.id); replaceInputRef.current?.click() }}
                        className="text-xs font-medium text-muted hover:text-paper hover:bg-ink-3 px-2.5 py-1.5 rounded-md">
                        Replace
                      </button>
                      <button onClick={() => setDeleteFileId(file.id)}
                        className="text-xs font-medium text-muted hover:text-red-400 hover:bg-red-400/10 px-2.5 py-1.5 rounded-md">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full text-sm text-faint hover:text-paper hover:bg-ink-3/40 text-left px-4 sm:px-6 py-3.5">
                  {uploading ? 'Uploading...' : '+ Add more files (or drop them here)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invoice section */}
        <div className="bg-ink-2 border border-rule rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-paper mb-1">Invoice</h2>
              {portal.invoice_amount ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-paper tracking-tight">
                    ${Number(portal.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${portal.invoice_paid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                    {portal.invoice_paid ? 'Paid' : 'Awaiting payment'}
                  </span>
                </div>
              ) : (
                <p className="text-faint text-sm">No invoice yet. Add one and your client can pay right from the portal.</p>
              )}
            </div>
            {!portal.invoice_paid ? (
              <button onClick={() => setShowEditModal(true)}
                className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">
                {portal.invoice_amount ? 'Edit invoice' : 'Add invoice'}
              </button>
            ) : (
              <span className="text-xs text-faint">Locked after payment</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-6">Edit portal</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-muted mb-1.5 block">Portal name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-ink border border-rule-2 rounded-lg px-4 py-3 text-paper focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1.5 block">Description <span className="text-faint">(optional)</span></label>
                <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-ink border border-rule-2 rounded-lg px-4 py-3 text-paper focus:outline-none focus:border-accent text-sm"
                  placeholder="Optional note for your client" />
              </div>
              <div>
                <label className="text-sm text-muted mb-1.5 block">
                  Invoice amount <span className="text-faint">(optional)</span>
                  {portal.invoice_paid && <span className="ml-2 text-xs text-yellow-400">Locked — invoice already paid</span>}
                </label>
                <div className={`flex items-center bg-ink border rounded-lg px-4 py-3 focus-within:border-accent ${portal.invoice_paid ? 'border-rule-3 opacity-50' : 'border-rule-2'}`}>
                  <span className="text-faint text-sm mr-1">$</span>
                  <input type="number" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)}
                    disabled={portal.invoice_paid}
                    className="flex-1 bg-transparent text-paper focus:outline-none text-sm disabled:cursor-not-allowed"
                    placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted mb-1.5 block">
                  Portal password <span className="text-faint">(optional)</span>
                  {!isPro && <span className="ml-2 text-xs bg-accent-soft text-accent-text border border-accent/30 px-2 py-0.5 rounded-full">Pro</span>}
                </label>
                {isPro ? (
                  <>
                    <input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-ink border border-rule-2 rounded-lg px-4 py-3 text-paper focus:outline-none focus:border-accent text-sm"
                      placeholder="Leave blank to remove password" />
                    <p className="text-xs text-faint mt-1">Clients must enter this password to view the portal</p>
                  </>
                ) : (
                  <div className="bg-ink border border-rule-2 rounded-lg px-4 py-3 opacity-50 cursor-not-allowed flex items-center justify-between">
                    <span className="text-faint text-sm">Upgrade to Pro to enable password protection</span>
                    <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 border border-rule-2 text-muted hover:text-paper py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="flex-1 bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete portal confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Delete this portal?</h2>
            <p className="text-muted text-sm mb-6">
              This will permanently delete <span className="text-paper font-medium">{portal.name}</span> and all {files.length} file{files.length !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-rule-2 text-muted hover:text-paper py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={handleDeletePortal} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Yes, delete portal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete file confirmation */}
      {deleteFileId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Delete this file?</h2>
            <p className="text-muted text-sm mb-6">
              <span className="text-paper">{files.find(f => f.id === deleteFileId)?.name}</span> will be permanently removed from this portal.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFileId(null)} className="flex-1 border border-rule-2 text-muted hover:text-paper py-2.5 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => { const file = files.find(f => f.id === deleteFileId); if (file) handleDeleteFile(file.id, file.file_path) }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm">
                Delete file
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}