'use client'
import { useState, useEffect, useRef } from 'react'
import FileThumb from '@/app/_components/FileThumb'
import FilePreview from '@/app/_components/FilePreview'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Switch from '@/app/_components/Switch'
import { PageSkeleton } from '../../AppSkeleton'
import { useCrumbs, useWorkspace } from '../../../WorkspaceProvider'
import { hasTeams } from '@/lib/workspace'
import type { Team } from '@/lib/workspaceData'
import { awaitingPayment } from '@/lib/paywall'
import { APP_HOST } from '@/lib/appHost'
import { portalUrl } from '@/lib/portalUrl'
import { markLinkCopied } from '../../OnboardingChecklist'

interface Portal {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  invoice_amount: number | null
  invoice_paid: boolean
  is_active: boolean
  owner_username: string
  files_ready: boolean
  password_protected: boolean
  team_shared: boolean
  approval_required?: boolean | null
  approval_status?: 'approved' | 'changes_requested' | null
  approval_note?: string | null
  approval_name?: string | null
  approval_at?: string | null
  lock_until_paid?: boolean | null
}

// Marks a drag as a reorder of the file list (not files from outside)
const REORDER_TYPE = 'application/x-voxabase-reorder'

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
  // "Uploading 2 of 5…" while a batch goes up
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  // Upload blocked by the plan's storage limit: the error offers an upgrade
  const [storageFull, setStorageFull] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  // Opened from the Invoice card: start in the amount field
  const [focusInvoice, setFocusInvoice] = useState(false)
  const openInvoiceEdit = () => { setFocusInvoice(true); setShowEditModal(true) }
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null)
  // Which file is open in the preview (View)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  // Which file's ⋯ menu (Replace, Delete) is open
  const [fileMenuId, setFileMenuId] = useState<string | null>(null)
  // Rename: the name your client sees and downloads get. The extension stays put.
  const [renaming, setRenaming] = useState<{ id: string; base: string; ext: string } | null>(null)
  const [renameError, setRenameError] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editInvoice, setEditInvoice] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [togglingReady, setTogglingReady] = useState(false)
  const [savingApproval, setSavingApproval] = useState(false)
  const [savingLock, setSavingLock] = useState(false)
  const [lockError, setLockError] = useState('')
  // Moving between Personal and Team
  const [moveTarget, setMoveTarget] = useState<Team | null>(null)
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')
  // Reordering: the gap the dragged file would land in (0 = above the first file)
  const [dropAtState, setDropAtState] = useState<number | null>(null)
  // Also kept in a ref: a drop can arrive before the last dragover has re-rendered
  const dropAtRef = useRef<number | null>(null)
  const dropAt = dropAtState
  const setDropAt = (gap: number | null) => { dropAtRef.current = gap; setDropAtState(gap) }
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewStats, setViewStats] = useState<{ count: number; lastViewed: string | null }>({ count: 0, lastViewed: null })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { user, ws, teams, liveDomain, refresh, switchWorkspace } = useWorkspace()
  useCrumbs(portal ? [portal.name] : [])
  // Teammates work in the owner's workspace; only the owner can delete a portal
  const isOwner = ws.isOwner
  const userPlan = ws.owner?.plan || 'free'
  // Teams you've joined, which you can move your own portals into
  const myTeams = ws.isOwner ? teams.filter(t => t.owner_id !== user.id) : []
  const ownerId = ws.ownerId

  // Loads again if the workspace changes (a move, or a switch from the sidebar)
  useEffect(() => {
    const load = async () => {
      const { id } = await params

      const { data: portalData } = await supabase.from('portals').select('*').eq('id', id).eq('user_id', ownerId).single()
      if (!portalData) { router.push('/dashboard'); return }
      setPortal(portalData)
      setEditName(portalData.name)
      setEditDescription(portalData.description || '')
      setEditInvoice(portalData.invoice_amount?.toString() || '')
      // Passwords live in a private table only the owner and team can read
      if (portalData.password_protected) {
        const { data: pw } = await supabase.from('portal_passwords').select('password').eq('portal_id', id).maybeSingle()
        setEditPassword(pw?.password || '')
      }

      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .eq('portal_id', id)
        .eq('user_id', ownerId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the workspace owner changes
  }, [ownerId])

  const handleToggleReady = async () => {
    if (!portal) return
    if (files.length === 0 && !portal.files_ready) return
    setTogglingReady(true)
    const newVal = !portal.files_ready
    const { error } = await supabase.from('portals').update({ files_ready: newVal }).eq('id', portal.id)
    if (!error) { setPortal({ ...portal, files_ready: newVal }); refresh() }
    setTogglingReady(false)
  }

  // Files unlock after payment: the client sees the list, downloads once paid
  const handleToggleLock = async () => {
    if (!portal) return
    setSavingLock(true); setLockError('')
    const next = !portal.lock_until_paid
    const { error } = await supabase.from('portals').update({ lock_until_paid: next }).eq('id', portal.id)
    if (error) setLockError('Couldn’t save this setting. Please try again.')
    else { setPortal({ ...portal, lock_until_paid: next }); refresh() }
    setSavingLock(false)
  }

  // Client approvals (Agency): turn the review step on/off, or clear a response
  // so the client sees a fresh review after you've made changes.
  const handleToggleApproval = async () => {
    if (!portal) return
    setSavingApproval(true)
    const next = !portal.approval_required
    const { error } = await supabase.from('portals').update({ approval_required: next }).eq('id', portal.id)
    if (!error) setPortal({ ...portal, approval_required: next })
    setSavingApproval(false)
  }

  // Owner (Agency): flip a portal between Personal and Team. Link and files stay the same.
  const handleToggleShared = async () => {
    if (!portal) return
    setMoving(true); setMoveError('')
    const next = !portal.team_shared
    const { error } = await supabase.from('portals').update({ team_shared: next }).eq('id', portal.id)
    if (error) { setMoving(false); setMoveError('Could not move the portal. Please try again.'); return }
    setPortal({ ...portal, team_shared: next })
    await switchWorkspace(next ? portal.user_id : null, { stay: true })
    setMoving(false)
  }

  // Teammate: move one of your own portals into a Team (it becomes the owner's)
  const handleMoveToTeam = async () => {
    if (!portal || !moveTarget) return
    setMoving(true); setMoveError('')
    const res = await fetch('/api/portals/move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalId: portal.id, toOwnerId: moveTarget.owner_id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setMoving(false); setMoveError(data.error || 'Could not move the portal. Please try again.'); return }
    // It now belongs to the team owner: open it there (the page reloads it)
    setMoveTarget(null)
    await switchWorkspace(moveTarget.owner_id, { stay: true })
    setMoving(false)
  }

  const handleResetApproval = async () => {
    if (!portal) return
    setSavingApproval(true)
    const cleared = { approval_status: null, approval_note: null, approval_name: null, approval_at: null }
    const { error } = await supabase.from('portals').update(cleared).eq('id', portal.id)
    if (!error) setPortal({ ...portal, ...cleared })
    setSavingApproval(false)
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
  const tooLarge = (fileName: string, fileSize: number) =>
    `“${fileName}” is ${(fileSize / 1048576).toFixed(0)} MB, over the ${MAX_FILE_MB} MB limit per file. Try exporting a smaller version, or split it into parts.`

  const describeUploadError = (err: unknown, fileName: string, fileSize: number): string => {
    const raw = (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err)).toLowerCase()
    const status = (err && typeof err === 'object' && 'statusCode' in err) ? String((err as { statusCode: unknown }).statusCode) : ''
    const isSize = status === '413' || raw.includes('maximum allowed size') || raw.includes('payload too large') || raw.includes('exceeded')
    if (isSize) {
      return tooLarge(fileName, fileSize)
    }
    if (raw.includes('mime') || raw.includes('not allowed')) {
      return `"${fileName}" could not be uploaded — that file type is not supported.`
    }
    return `"${fileName}" failed to upload: ${(err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message) : 'unknown error'}.`
  }

  const uploadFiles = async (fileList: FileList) => {
    if (!portal) return
    setUploadError(null)
    setStorageFull(false)
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    // Check storage limit
    const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: portal.user_id })
    const usedBytes = storageData || 0
    const limitBytes = STORAGE_LIMITS[userPlan] || STORAGE_LIMITS.free
    const incomingBytes = Array.from(fileList).reduce((sum, f) => sum + f.size, 0)

    if (usedBytes + incomingBytes > limitBytes) {
      const usedGB = (usedBytes / 1_073_741_824).toFixed(2)
      const limitGB = (limitBytes / 1_073_741_824).toFixed(0)
      setUploadError(`Not enough storage for ${fileList.length === 1 ? 'this file' : 'these files'}. You've used ${usedGB} GB of your ${limitGB} GB.`)
      setStorageFull(true)
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxOrder = files.length > 0 ? Math.max(...files.map(f => f.sort_order || 0)) : 0
    let orderCounter = maxOrder + 1
    const failures: string[] = []
    const batch = Array.from(fileList)
    for (const [i, file] of batch.entries()) {
      setUploadProgress({ done: i, total: batch.length })
      // Block oversized files up front so the user gets an instant, clean message.
      if (file.size > MAX_FILE_BYTES) {
        failures.push(tooLarge(file.name, file.size))
        continue
      }
      const filePath = `${portal.user_id}/${portal.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('deliverables').upload(filePath, file)
      if (upErr) {
        failures.push(describeUploadError(upErr, file.name, file.size))
        continue
      }
      await supabase.from('files').insert({
        portal_id: portal.id,
        user_id: portal.user_id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        sort_order: orderCounter++,
      })
    }
    if (failures.length) setUploadError(failures.join(' '))
    const { data: filesData } = await supabase.from('files').select('*').eq('portal_id', portal.id).eq('user_id', portal.user_id).order('sort_order', { ascending: true })
    setFiles(filesData || [])
    setUploading(false)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await uploadFiles(e.target.files)
  }

  // Reordering drags a row within the list; only files dragged in from
  // outside the page are uploads
  const isUpload = (e: React.DragEvent) => !draggingId && !e.dataTransfer.types.includes(REORDER_TYPE) && e.dataTransfer.types.includes('Files')

  const handleDropZone = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (isUpload(e) && e.dataTransfer.files.length > 0) await uploadFiles(e.dataTransfer.files)
  }

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !replacingId || !portal) return
    const file = e.target.files[0]
    const existingFile = files.find(f => f.id === replacingId)
    if (!existingFile) return
    // Guard before removing the old file, so an oversized replacement can't
    // leave the portal with a missing file.
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(tooLarge(file.name, file.size))
      setReplacingId(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
      return
    }
    setUploadError(null)
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.storage.from('deliverables').remove([existingFile.file_path])
    const newPath = `${portal.user_id}/${portal.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('deliverables').upload(newPath, file)
    if (!upErr) {
      await supabase.from('files').update({ name: file.name, file_path: newPath, file_size: file.size, file_type: file.type }).eq('id', replacingId)
      const { data: filesData } = await supabase.from('files').select('*').eq('portal_id', portal.id).eq('user_id', portal.user_id).order('sort_order', { ascending: true })
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
    e.dataTransfer.setData(REORDER_TYPE, fileId)
  }

  // Move one file to a new position and save the order
  const moveFile = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= files.length) return
    const newFiles = [...files]
    const [removed] = newFiles.splice(fromIndex, 1)
    newFiles.splice(toIndex, 0, removed)
    const updated = newFiles.map((f, i) => ({ ...f, sort_order: i }))
    setFiles(updated)
    await Promise.all(updated.map(f => supabase.from('files').update({ sort_order: f.sort_order }).eq('id', f.id)))
  }

  // Only where dropping would change the order (not right above or below the dragged file)
  const showDropLine = (gap: number) => {
    if (dropAt !== gap || !draggingId) return false
    const from = files.findIndex(f => f.id === draggingId)
    return gap !== from && gap !== from + 1
  }

  // While reordering, the whole page is the drop area: only the cursor's height
  // matters (drift onto the sidebar or the right column and it still works).
  // The gap is the number of files whose middle is above the cursor.
  const gapAt = (y: number) => {
    let gap = 0
    document.querySelectorAll('[data-file-row]').forEach(r => {
      const b = r.getBoundingClientRect()
      if (y > b.top + b.height / 2) gap++
    })
    return gap
  }

  useEffect(() => {
    if (!draggingId) return
    const over = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      setDropAt(gapAt(e.clientY))
    }
    const drop = async (e: DragEvent) => {
      e.preventDefault()
      const from = files.findIndex(f => f.id === draggingId)
      const gap = dropAtRef.current
      setDraggingId(null)
      setDropAt(null)
      if (from === -1 || gap === null) return
      // Gaps count positions with the dragged file still in place
      await moveFile(from, gap > from ? gap - 1 : gap)
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('drop', drop) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebinds per drag; moveFile reads the current files
  }, [draggingId, files])

  // Files dragged in from the computer: drop anywhere on the page to upload
  const [pageDrop, setPageDrop] = useState(false)
  useEffect(() => {
    const enter = (e: DragEvent) => {
      const types = e.dataTransfer?.types || []
      if (types.includes('Files') && !types.includes(REORDER_TYPE)) setPageDrop(true)
    }
    window.addEventListener('dragenter', enter)
    return () => window.removeEventListener('dragenter', enter)
  }, [])

  const startRename = (file: FileRecord) => {
    // "Report final.pdf" → edit "Report final", keep ".pdf"
    const dot = file.name.lastIndexOf('.')
    const ext = dot > 0 && file.name.length - dot <= 10 ? file.name.slice(dot) : ''
    setRenaming({ id: file.id, base: ext ? file.name.slice(0, dot) : file.name, ext })
    setRenameError('')
  }

  const handleRename = async () => {
    if (!renaming) return
    // Slashes would turn into folders inside the Download all zip
    const base = renaming.base.replace(/[\\/]/g, '-').trim()
    if (!base) { setRenameError('Enter a name'); return }
    const name = base + renaming.ext
    setSavingName(true)
    const { error } = await supabase.from('files').update({ name }).eq('id', renaming.id)
    setSavingName(false)
    if (error) { setRenameError('Couldn’t rename the file. Try again.'); return }
    setFiles(fs => fs.map(f => (f.id === renaming.id ? { ...f, name } : f)))
    setRenaming(null)
  }

  const handleEditSave = async () => {
    if (!portal) return
    setSaving(true)
    await supabase.from('portals').update({
      name: editName,
      description: editDescription || null,
      invoice_amount: portal.invoice_paid ? portal.invoice_amount : (editInvoice ? parseFloat(editInvoice) : null),
      ...(userPlan !== 'free' ? { password_protected: !!editPassword } : {}),
    }).eq('id', portal.id)
    if (userPlan !== 'free') {
      if (editPassword) {
        await supabase.from('portal_passwords').upsert({ portal_id: portal.id, user_id: portal.user_id, password: editPassword })
      } else {
        await supabase.from('portal_passwords').delete().eq('portal_id', portal.id)
      }
    }
    setPortal({
      ...portal,
      name: editName,
      description: editDescription,
      invoice_amount: portal.invoice_paid ? portal.invoice_amount : (editInvoice ? parseFloat(editInvoice) : null),
      password_protected: userPlan !== 'free' ? !!editPassword : portal.password_protected,
    })
    setSaving(false)
    setShowEditModal(false)
    refresh()
  }

  const handleDeletePortal = async () => {
    if (!portal) return
    setDeleting(true)
    for (const file of files) {
      await supabase.storage.from('deliverables').remove([file.file_path])
    }
    await supabase.from('files').delete().eq('portal_id', portal.id)
    await supabase.from('portals').delete().eq('id', portal.id)
    await refresh()
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

  if (loading) return <PageSkeleton variant="detail" />
  if (!portal) return null

  const shareUrl = portalUrl(portal, liveDomain)

  const canToggleReady = files.length > 0
  const uploadLabel = uploadProgress && uploadProgress.total > 1
    ? `Uploading ${uploadProgress.done + 1} of ${uploadProgress.total}…`
    : 'Uploading…'
  const isPro = userPlan === 'pro' || userPlan === 'agency'

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        {/* Back button — clean arrow */}

        {/* Portal header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-paper tracking-tight">{portal.name}</h1>
            {portal.description && <p className="text-muted text-sm mt-1">{portal.description}</p>}
          </div>
          <div className="relative flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setFocusInvoice(false); setShowEditModal(true) }}
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
                <div role="menu" className="absolute right-0 top-full mt-2 z-30 w-56 bg-ink-2 border border-rule-2 rounded-xl p-1.5 shadow-xl shadow-black/40">
                  <a role="menuitem" href={`/${portal.owner_username}/${portal.slug}`}
                    className="block text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Open client view</a>
                  {isOwner && hasTeams(userPlan) && (
                    <button role="menuitem" onClick={() => { setMoreOpen(false); handleToggleShared() }} disabled={moving}
                      className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">
                      {portal.team_shared ? 'Move to Personal' : 'Move to Team'}
                    </button>
                  )}
                  {isOwner && myTeams.map(t => (
                    <button key={t.owner_id} role="menuitem" onClick={() => { setMoreOpen(false); setMoveError(''); setMoveTarget(t) }}
                      className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2 truncate">
                      Move to {t.owner_label || 'Team'} · Team
                    </button>
                  ))}
                  {isOwner && (
                  <button role="menuitem" onClick={() => { setMoreOpen(false); setShowDeleteModal(true) }}
                    className="w-full text-left text-sm text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2">Delete portal</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Files on the left; publishing, link, invoice and approval in a column on
            the right. On small screens it's one column: publish and link first. */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* Files section */}
          <div className="order-3 lg:order-none min-w-0 border border-rule rounded-xl">
            <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-paper">
                  Files {files.length > 0 && <span className="text-faint font-normal">{files.length}</span>}
                </h2>
                {files.length > 1 && <p className="hidden [@media(hover:hover)]:block text-xs text-faint mt-0.5">Drag to reorder</p>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-2 text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? uploadLabel : 'Upload files'}
              </button>
              <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
              <input ref={replaceInputRef} type="file" onChange={handleReplace} className="hidden" />
            </div>

            {uploadError && (
              <div className="mx-6 mt-4 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.34 3.94l-7.5 12.99A1.5 1.5 0 004.14 20.25h15.72a1.5 1.5 0 001.3-2.32l-7.5-12.99a1.5 1.5 0 00-2.6 0z" />
                </svg>
                <span className="flex-1">
                  {uploadError}
                  {storageFull && (isOwner
                    ? <> <Link href="/pricing" className="font-semibold text-paper underline underline-offset-2 hover:text-white">Upgrade plan</Link></>
                    : ' Ask the team owner to upgrade for more space.')}
                </span>
                <button onClick={() => { setUploadError(null); setStorageFull(false) }} className="text-red-400/70 hover:text-red-300 flex-shrink-0" aria-label="Dismiss">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(isUpload(e)) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropZone}
              className={`rounded-b-xl ${isDragOver ? 'bg-accent-soft/40' : ''}`}
            >
              {files.length === 0 ? (
                <div className="px-6 py-16 text-center cursor-pointer rounded-b-xl hover:bg-accent-soft/10" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-12 h-12 bg-ink-3 border border-rule-2 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-muted text-sm font-medium">{uploading ? uploadLabel : 'Click or drag files here to upload'}</p>
                  <p className="text-faint text-xs mt-1">PDFs, images, videos, zips, any file type · up to {MAX_FILE_MB} MB each</p>
                </div>
              ) : (
                <div className="divide-y divide-rule">
                  {files.map((file, index) => (
                    <div key={file.id} draggable data-file-row
                      onDragStart={(e) => handleDragStart(e, file.id)}
                      onDragEnd={() => { setDraggingId(null); setDropAt(null) }}
                      className={`px-4 sm:px-6 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 group cursor-grab active:cursor-grabbing hover:bg-ink-3/40 transition-colors relative ${draggingId === file.id ? 'opacity-40' : ''}`}
                    >
                      {/* Where the dragged file will land: a line in the gap above this row (or below the last one) */}
                      {showDropLine(index) && <DropLine edge="top" />}
                      {index === files.length - 1 && showDropLine(files.length) && <DropLine edge="bottom" />}
                      <div className="flex items-center gap-3 min-w-0 flex-1 basis-[13rem]">
                        <div className="text-faint group-hover:text-muted flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <FileThumb file={file}
                          className="w-9 h-9 bg-ink-3 border border-rule-2 rounded-lg flex items-center justify-center text-[10px] font-bold text-accent-text flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-paper truncate">{file.name}</p>
                          <p className="text-xs text-faint mt-0.5">{formatSize(file.file_size)}</p>
                        </div>
                      </div>
                      {/* View stays in reach; everything else sits in the ⋯ menu */}
                      <div className="relative flex items-center gap-1 ml-auto flex-shrink-0">
                        <button onClick={() => setPreviewIndex(index)}
                          className="text-xs font-medium text-muted hover:text-paper hover:bg-ink-3 px-2.5 py-1.5 rounded-md">
                          View
                        </button>
                        <button onClick={() => setFileMenuId(m => (m === file.id ? null : file.id))}
                          aria-label={`More actions for ${file.name}`} aria-haspopup="menu" aria-expanded={fileMenuId === file.id}
                          className="text-muted hover:text-paper hover:bg-ink-3 w-8 h-8 rounded-md flex items-center justify-center">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                        </button>
                        {fileMenuId === file.id && (
                          <>
                            <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setFileMenuId(null)} />
                            <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-44 bg-ink-2 border border-rule-2 rounded-xl p-1.5 shadow-xl shadow-black/40">
                              <button role="menuitem" onClick={() => { setFileMenuId(null); startRename(file) }}
                                className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Rename</button>
                              {/* Reordering without dragging (phones, keyboards) */}
                              {index > 0 && (
                                <button role="menuitem" onClick={() => { setFileMenuId(null); moveFile(index, index - 1) }}
                                  className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Move up</button>
                              )}
                              {index < files.length - 1 && (
                                <button role="menuitem" onClick={() => { setFileMenuId(null); moveFile(index, index + 1) }}
                                  className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Move down</button>
                              )}
                              <button role="menuitem" onClick={() => { setFileMenuId(null); setReplacingId(file.id); replaceInputRef.current?.click() }}
                                className="w-full text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">Replace file</button>
                              <button role="menuitem" onClick={() => { setFileMenuId(null); setDeleteFileId(file.id) }}
                                className="w-full text-left text-sm text-red-400 hover:bg-red-400/10 rounded-lg px-3 py-2">Delete file</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full text-sm text-faint hover:text-paper hover:bg-ink-3/40 text-left px-4 sm:px-6 py-3.5 rounded-b-xl">
                    {uploading ? uploadLabel : `+ Add more files (or drop them here) · up to ${MAX_FILE_MB} MB each`}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="contents lg:flex lg:flex-col lg:gap-4">
            {/* Publish: the client sees the files only once they're published */}
            <section aria-label="Publishing" className="order-1 lg:order-none border border-rule rounded-xl p-5">
              <h2 className="font-semibold text-paper text-sm flex items-center gap-2">
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${portal.files_ready ? 'bg-green-400' : 'bg-amber-400'}`} />
                {portal.files_ready ? 'Files are published' : 'Files not published yet'}
              </h2>
              <p className="text-xs text-faint mt-1">
                {portal.files_ready
                  ? (awaitingPayment(portal) ? 'Your client sees the files, which unlock once the invoice is paid.' : 'Your client can see and download every file.')
                  : !canToggleReady
                  ? 'Upload at least one file, then publish it for your client.'
                  : 'Until you publish, your client sees a “files being prepared” message.'}
              </p>
              {portal.files_ready ? (
                <button onClick={handleToggleReady} disabled={togglingReady}
                  className="mt-3.5 w-full text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-4 py-2 rounded-lg disabled:opacity-50">
                  {togglingReady ? 'Unpublishing…' : 'Unpublish'}
                </button>
              ) : (
                <button onClick={handleToggleReady} disabled={togglingReady || !canToggleReady}
                  className="mt-3.5 w-full text-sm font-semibold bg-paper hover:bg-white text-ink px-4 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                  {togglingReady ? 'Publishing…' : 'Publish files'}
                </button>
              )}
            </section>
            {/* Client link: click the link to copy it; Preview sits top right like the Invoice card's Edit */}
            <section aria-label="Client link" className="order-2 lg:order-none border border-rule rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-paper text-sm">Client link</h2>
                {/* Same tab: the client view's "Back to portal" (or Back) returns here. Cmd/Ctrl-click still opens a new tab. */}
                <a href={`/${portal.owner_username}/${portal.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-paper hover:underline underline-offset-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Preview
                </a>
              </div>
              <button type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(shareUrl) } catch { return }
                  markLinkCopied()
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                title="Click to copy"
                aria-label={copied ? 'Link copied' : `Copy link ${shareUrl}`}
                className={`group w-full flex items-center gap-2.5 min-w-0 bg-ink border rounded-lg px-3.5 py-2.5 text-left transition-colors ${copied ? 'border-green-400/40' : 'border-rule hover:border-rule-3 hover:bg-ink-2'}`}>
                <svg className="w-4 h-4 text-faint flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                <span className="flex-1 min-w-0 text-sm text-paper truncate">{shareUrl.replace(/^https?:\/\//, '')}</span>
                {copied ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Copied
                  </span>
                ) : (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-faint group-hover:text-paper">
                    <span className="hidden group-hover:inline">Copy</span>
                    {/* Always shown: phones have no hover, so this is how they know it copies */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                  </span>
                )}
              </button>
              <p className="flex items-center gap-1.5 text-xs text-faint mt-3">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {viewStats.count > 0
                  ? `Opened ${viewStats.count} time${viewStats.count !== 1 ? 's' : ''} · last ${timeAgo(viewStats.lastViewed)}`
                  : 'Not opened yet'}
              </p>
            </section>
            {/* Invoice section */}
            <div className="order-4 lg:order-none border border-rule rounded-xl p-5">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <h2 className="font-semibold text-paper text-sm">Invoice</h2>
                {/* Opens the portal's Edit dialog at the amount; locked once paid */}
                {!!portal.invoice_amount && !portal.invoice_paid && (
                  <button onClick={openInvoiceEdit} className="text-xs font-medium text-muted hover:text-paper hover:underline underline-offset-2">Edit</button>
                )}
              </div>
              {portal.invoice_amount ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-2xl font-bold text-paper tracking-tight">
                    ${Number(portal.invoice_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${portal.invoice_paid ? 'bg-green-400' : 'bg-amber-400'}`} />
                    {portal.invoice_paid ? 'Paid' : 'Awaiting payment'}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-faint text-sm">No invoice yet. Add one and your client can pay right from the portal.</p>
                  <button onClick={openInvoiceEdit}
                    className="mt-3 text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">
                    Add invoice
                  </button>
                </>
              )}

              {/* Files unlock after payment */}
              <div className="mt-4 border-t border-rule pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p id="lock-label" className="text-sm font-semibold text-paper">Lock files until paid</p>
                    <p className="text-xs text-faint mt-1">
                      {!portal.invoice_amount
                        ? 'Add an invoice to keep files locked until it’s paid.'
                        : portal.invoice_paid
                        ? (portal.lock_until_paid ? 'Paid, so the files are unlocked.' : 'Invoice paid.')
                        : portal.lock_until_paid
                        ? 'Your client sees the file list and can download once they pay.'
                        : 'Your client can download before paying.'}
                    </p>
                  </div>
                  <Switch on={!!portal.lock_until_paid} labelledBy="lock-label" onClick={handleToggleLock}
                    disabled={savingLock || !portal.invoice_amount || portal.invoice_paid} />
                </div>
                {portal.lock_until_paid && !!portal.invoice_amount && !portal.invoice_paid && ws.owner?.stripe_onboarding_complete !== true && (
                  <p className="mt-3 text-xs text-amber-400">
                    {isOwner
                      ? <>Your client can’t pay until you <Link href="/stripe-setup" className="underline underline-offset-2 hover:text-amber-300">connect Stripe</Link>, so the files would stay locked.</>
                      : 'Your client can’t pay until the team owner connects Stripe, so the files would stay locked.'}
                  </p>
                )}
                {lockError && <p role="alert" className="mt-2 text-xs text-red-400">{lockError}</p>}
              </div>
            </div>
            {/* Client approval (Agency) */}
            <div className="order-5 lg:order-none border border-rule rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-paper text-sm flex items-center gap-2">
                    Client approval
                    {userPlan !== 'agency' && <span className="text-[11px] font-semibold text-accent-text border border-accent/30 bg-accent-soft px-2 py-0.5 rounded-full">Agency</span>}
                  </h2>
                  <p className="text-faint text-xs mt-1">
                    {userPlan !== 'agency'
                      ? 'Let clients approve a delivery or request changes, right from the portal.'
                      : portal.approval_required
                      ? 'Your client can approve this delivery or request changes once files are published.'
                      : 'Turn on to ask your client to approve this delivery or request changes.'}
                  </p>
                </div>
                {userPlan !== 'agency' ? (
                  <Link href="/pricing" className="whitespace-nowrap text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">See Agency</Link>
                ) : (
                  <button
                    onClick={handleToggleApproval}
                    disabled={savingApproval}
                    role="switch"
                    aria-checked={!!portal.approval_required}
                    aria-label="Ask client for approval"
                    style={{
                      position: 'relative', display: 'inline-flex', alignItems: 'center',
                      width: '48px', height: '28px', borderRadius: '9999px', flexShrink: 0,
                      cursor: 'pointer', opacity: savingApproval ? 0.6 : 1,
                      backgroundColor: portal.approval_required ? '#4ade80' : '#4a4557',
                      border: 'none', transition: 'background-color 0.2s',
                    }}
                  >
                    <span style={{
                      display: 'inline-block', width: '20px', height: '20px', borderRadius: '9999px',
                      backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      transform: portal.approval_required ? 'translateX(24px)' : 'translateX(4px)',
                      transition: 'transform 0.2s',
                    }} />
                  </button>
                )}
              </div>

              {userPlan === 'agency' && portal.approval_required && (
                <div className="mt-4 border-t border-rule pt-4">
                  {portal.approval_status ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm text-paper">
                          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${portal.approval_status === 'approved' ? 'bg-green-400' : 'bg-amber-400'}`} />
                          <span className="font-semibold">{portal.approval_status === 'approved' ? 'Approved' : 'Changes requested'}</span>
                          <span className="text-faint">
                            {portal.approval_name ? `by ${portal.approval_name}` : 'by your client'}
                            {portal.approval_at && ` · ${new Date(portal.approval_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                          </span>
                        </p>
                        <button onClick={handleResetApproval} disabled={savingApproval}
                          className="text-xs text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3 py-1.5 rounded-lg disabled:opacity-50">
                          Ask again
                        </button>
                      </div>
                      {portal.approval_status === 'changes_requested' && portal.approval_note && (
                        <p className="mt-3 whitespace-pre-line rounded-lg border border-rule bg-ink px-3.5 py-3 text-sm text-muted">{portal.approval_note}</p>
                      )}
                      {portal.approval_status === 'changes_requested' && (
                        <p className="mt-2 text-xs text-faint">Made the changes? Update the files, then click Ask again so your client can review the new version.</p>
                      )}
                    </>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-rule-3" />
                      {!portal.files_ready ? 'Your client can review once files are published'
                    : awaitingPayment(portal) ? 'Your client can review once they’ve paid and the files unlock'
                    : 'Waiting for your client to review'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-xl p-8 w-full max-w-md">
            <h2 className="text-lg font-bold mb-6">Edit portal</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="edit-name" className="text-sm text-muted mb-1.5 block">Portal name</label>
                <input id="edit-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <label htmlFor="edit-description" className="text-sm text-muted mb-1.5 block">Description <span className="text-faint">(optional)</span></label>
                <input id="edit-description" type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper focus:outline-none focus:border-accent text-sm"
                  placeholder="Optional note for your client" />
              </div>
              <div>
                <label htmlFor="edit-invoice" className="text-sm text-muted mb-1.5 block">
                  Invoice amount <span className="text-faint">(optional)</span>
                  {portal.invoice_paid && <span className="ml-2 text-xs text-yellow-400">Locked — invoice already paid</span>}
                </label>
                <div className={`flex items-center bg-ink border rounded-lg px-4 py-3 focus-within:border-accent ${portal.invoice_paid ? 'border-rule-3 opacity-50' : 'border-rule-2'}`}>
                  <span className="text-faint text-sm mr-1">$</span>
                  <input id="edit-invoice" autoFocus={focusInvoice} type="number" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)}
                    disabled={portal.invoice_paid}
                    className="flex-1 bg-transparent text-paper focus:outline-none text-sm disabled:cursor-not-allowed"
                    placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              <div>
                <label htmlFor="edit-password" className="text-sm text-muted mb-1.5 block">
                  Portal password <span className="text-faint">(optional)</span>
                  {!isPro && <span className="ml-2 text-xs bg-accent-soft text-accent-text border border-accent/30 px-2 py-0.5 rounded-full">Pro</span>}
                </label>
                {isPro ? (
                  <>
                    <input id="edit-password" type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper focus:outline-none focus:border-accent text-sm"
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

      {/* Move a personal portal into a Team (teammates) */}
      {moveTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="move-title" className="bg-ink-2 border border-rule-2 rounded-xl p-6 w-full max-w-md">
            <h2 id="move-title" className="text-lg font-bold text-paper mb-2">Move to {moveTarget.owner_label || 'the team'}?</h2>
            <p className="text-sm text-muted mb-3">“{portal.name}” will belong to {moveTarget.owner_label || 'the team'} and appear in its Team workspace, where you can keep working on it.</p>
            <ul className="text-sm text-muted mb-5 flex flex-col gap-1.5 list-disc pl-5">
              <li>The link changes to <span className="text-paper">{APP_HOST}/{moveTarget.owner_username}/…</span> and the current link stops working.</li>
              <li>Invoice payments go to {moveTarget.owner_label || 'the team'}’s Stripe account.</li>
              <li>You can’t move it back to your workspace.</li>
            </ul>
            {moveError && <p role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">{moveError}</p>}
            <div className="flex gap-2.5">
              <button onClick={() => setMoveTarget(null)} disabled={moving}
                className="flex-1 border border-rule-2 hover:border-rule-3 text-muted hover:text-paper py-2.5 rounded-lg text-sm">Cancel</button>
              <button onClick={handleMoveToTeam} disabled={moving}
                className="flex-1 bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {moving ? 'Moving…' : 'Move portal'}
              </button>
            </div>
          </div>
        </div>
      )}
      {moveError && !moveTarget && (
        <div role="alert" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 text-red-400 text-sm bg-ink-2 border border-red-400/30 rounded-lg px-4 py-3 shadow-xl">{moveError}</div>
      )}

      {/* Delete portal confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-xl p-8 w-full max-w-md">
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

      {/* Full-page drop target for files from the computer */}
      {pageDrop && (
        <div className="fixed inset-0 z-40 bg-ink/85 backdrop-blur-sm p-4 sm:p-8"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDragLeave={() => setPageDrop(false)}
          onDrop={(e) => {
            e.preventDefault()
            setPageDrop(false)
            if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files)
          }}>
          <div className="pointer-events-none h-full rounded-2xl border-2 border-dashed border-accent-mark/70 bg-accent-soft/20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-accent/40 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-accent-text" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-paper">Drop files to upload</p>
            <p className="text-sm text-muted mt-1">to {portal.name} · up to {MAX_FILE_MB} MB each</p>
          </div>
        </div>
      )}

      {previewIndex !== null && files[previewIndex] && (
        <FilePreview files={files} index={previewIndex} onIndex={setPreviewIndex} onClose={() => setPreviewIndex(null)} />
      )}

      {/* Rename file */}
      {renaming && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <form role="dialog" aria-modal="true" aria-labelledby="rename-title"
            onSubmit={(e) => { e.preventDefault(); handleRename() }}
            className="bg-ink-2 border border-rule-2 rounded-xl p-8 w-full max-w-md">
            <h2 id="rename-title" className="text-lg font-bold mb-1">Rename file</h2>
            <p className="text-muted text-sm mb-5">Your client sees this name, and downloads use it.</p>
            <label htmlFor="rename-file" className="text-sm text-muted mb-1.5 block">File name</label>
            <div className="flex items-center bg-ink border border-rule-2 rounded-lg focus-within:border-accent">
              <input id="rename-file" type="text" autoFocus maxLength={200} value={renaming.base}
                onChange={(e) => setRenaming({ ...renaming, base: e.target.value })}
                className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-paper text-sm focus:outline-none" />
              {renaming.ext && <span className="pr-3.5 text-sm text-faint">{renaming.ext}</span>}
            </div>
            {renameError && <p role="alert" className="text-red-400 text-sm mt-2">{renameError}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setRenaming(null)} className="flex-1 border border-rule-2 text-muted hover:text-paper py-2.5 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={savingName} className="flex-1 bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50">
                {savingName ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete file confirmation */}
      {deleteFileId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-ink-2 border border-rule-2 rounded-xl p-8 w-full max-w-md">
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
    </>
  )
}

// The reorder marker: a purple line with a dot at its start, on a row's top or bottom edge
function DropLine({ edge }: { edge: 'top' | 'bottom' }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-x-3 z-10 flex items-center ${edge === 'top' ? '-top-[5px]' : '-bottom-[5px]'}`}>
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full border-2 border-accent-mark bg-ink" />
      <span className="h-[3px] flex-1 rounded-full bg-accent-mark" />
    </span>
  )
}
