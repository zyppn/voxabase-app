'use client'
// Signs this browser out after a stretch with no activity in any Voxabase tab.
// Last activity is kept per device in localStorage, so every open tab shares it.
import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export const IDLE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const KEY = 'vb_last_active'
const WRITE_EVERY_MS = 60 * 1000

function readLast(): number | null {
  try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) && v > 0 ? v : null } catch { return null }
}
function writeNow() {
  try { localStorage.setItem(KEY, String(Date.now())) } catch { /* private mode: skip */ }
}

export function useIdleSignOut() {
  useEffect(() => {
    let lastWrite = 0
    let signingOut = false

    const check = async () => {
      const last = readLast()
      if (!signingOut && last !== null && Date.now() - last > IDLE_LIMIT_MS) {
        signingOut = true
        try { localStorage.removeItem(KEY) } catch { /* ignore */ }
        await createClient().auth.signOut({ scope: 'local' })
        window.location.href = '/login?expired=1'
        return true
      }
      return false
    }

    const touch = () => {
      if (Date.now() - lastWrite < WRITE_EVERY_MS) return
      lastWrite = Date.now()
      writeNow()
    }

    const onVisible = async () => { if (document.visibilityState === 'visible' && !(await check())) touch() }

    check().then((out) => { if (!out) { lastWrite = Date.now(); writeNow() } })
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(check, 5 * 60 * 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch))
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [])
}
