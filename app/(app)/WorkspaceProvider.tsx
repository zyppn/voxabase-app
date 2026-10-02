'use client'
// Holds the current workspace for every signed-in page. It lives in the (app)
// layout, so it (and the sidebar) stay mounted while you move between pages.
// - Switching workspaces loads the other workspace here, without a page reload.
// - Live: every 15 seconds while the tab is visible it checks in (presence) and
//   reloads portals and who's online; every minute, and when you come back to
//   the tab, it reloads everything. Closing the tab marks you offline.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { setWorkspaceCookie } from '@/lib/workspace'
import { loadLive, loadWorkspaceData, type WorkspaceData } from '@/lib/workspaceData'
import { syncThemeFromAccount } from '@/lib/theme'

interface WorkspaceContext extends WorkspaceData {
  /** A workspace switch is loading */
  switching: boolean
  /** `stay`: keep the current page (e.g. a portal that just moved into that workspace) */
  switchWorkspace: (ownerId: string | null, opts?: { stay?: boolean }) => Promise<void>
  /** Reload everything now (after creating, moving or deleting a portal) */
  refresh: () => Promise<void>
  crumbs: string[]
  setCrumbs: (crumbs: string[]) => void
}

const Ctx = createContext<WorkspaceContext | null>(null)

export function useWorkspace() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}

/** The breadcrumb after "Portals" for the page that calls it, e.g. ['Settings'] */
export function useCrumbs(crumbs: string[]) {
  const { setCrumbs } = useWorkspace()
  const key = crumbs.join('\u0000')
  useEffect(() => {
    setCrumbs(key ? key.split('\u0000') : [])
    return () => setCrumbs([])
  }, [key, setCrumbs])
}

const TICK_MS = 15_000
const FULL_EVERY = 4 // ticks: a full reload about once a minute

export default function WorkspaceProvider({ initial, children }: { initial: WorkspaceData; children: ReactNode }) {
  const [data, setData] = useState(initial)
  const [switching, setSwitching] = useState(false)
  const [crumbs, setCrumbs] = useState<string[]>([])
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()
  // The workspace we want on screen. A load that finishes after you've
  // switched elsewhere is dropped instead of flashing the old workspace back.
  const target = useRef(initial.wsId)
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])

  const refresh = useCallback(async () => {
    const want = target.current
    const next = await loadWorkspaceData(supabase, dataRef.current.user, want)
    if (target.current !== want) return
    target.current = next.wsId
    setData(next)
  }, [supabase])

  const refreshLive = useCallback(async () => {
    const { ws, wsId } = dataRef.current
    const live = await loadLive(supabase, ws)
    if (target.current !== wsId) return
    setData(d => (d.wsId === wsId ? { ...d, ...live } : d))
  }, [supabase])

  const switchWorkspace = useCallback(async (ownerId: string | null, opts?: { stay?: boolean }) => {
    if (ownerId === target.current) { await refresh(); return }
    setWorkspaceCookie(ownerId)
    target.current = ownerId
    setSwitching(true)
    try { await refresh() } finally { setSwitching(false) }
    // A portal page belongs to the workspace you just left
    if (!opts?.stay && pathname.startsWith('/dashboard/portal/')) router.push('/dashboard')
  }, [refresh, pathname, router])

  // Appearance follows the account (saved on another device, or by someone else
  // who used this browser): apply it once per page load
  useEffect(() => { syncThemeFromAccount(supabase) }, [supabase])

  // Presence check-ins and live updates
  useEffect(() => {
    let ticks = 0
    const checkIn = () => supabase.rpc('touch_presence')
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      await checkIn()
      if (++ticks % FULL_EVERY === 0) await refresh()
      else await refreshLive()
    }
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      await checkIn()
      await refresh()
    }
    checkIn()
    const timer = setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [supabase, refresh, refreshLive])

  // Closing the tab marks you offline right away, instead of after the
  // 3-minute timeout. A plain keepalive request survives the page unloading.
  const token = useRef<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { token.current = session?.access_token ?? null })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { token.current = session?.access_token ?? null })
    const onHide = () => {
      if (!token.current) return
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${dataRef.current.user.id}`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          Authorization: `Bearer ${token.current}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ last_seen_at: null }),
      }).catch(() => {})
    }
    window.addEventListener('pagehide', onHide)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('pagehide', onHide) }
  }, [supabase])

  const value = useMemo<WorkspaceContext>(
    () => ({ ...data, switching, switchWorkspace, refresh, crumbs, setCrumbs }),
    [data, switching, switchWorkspace, refresh, crumbs],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
