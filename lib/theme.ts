// Appearance: System (follows the device), Light or Dark. Saved per browser.
// The choice lives on <html data-theme>; CSS turns it into color-scheme, and
// every color token picks its light or dark value with light-dark().
// THEME_SCRIPT runs in <head> before the page paints, so there's no flash.
import type { SupabaseClient } from '@supabase/supabase-js'
export type Theme = 'system' | 'light' | 'dark'
export const THEMES: Theme[] = ['system', 'light', 'dark']
const KEY = 'vb_theme'

export const THEME_SCRIPT = `(function(){var t='system';try{var s=localStorage.getItem('${KEY}');if(s==='light'||s==='dark')t=s}catch(e){}document.documentElement.setAttribute('data-theme',t)})()`

export function readTheme(): Theme {
  const t = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null
  return t === 'light' || t === 'dark' ? t : 'system'
}

export function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  try {
    if (t === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, t)
  } catch { /* private mode: still applies for this page */ }
  window.dispatchEvent(new Event('vb-theme'))
}

// ── Per-account sync ─────────────────────────────────────────────────────
// The choice is also saved on the account (profiles.app_theme), so it follows
// you to other devices and each person on a shared computer gets their own.
// The browser keeps the last one used, for the sign-in screen and first paint.
// Every call is tolerant: before the column exists they quietly do nothing.

async function userId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Save to the account (the browser already has it via applyTheme) */
export async function saveAccountTheme(supabase: SupabaseClient, t: Theme) {
  const id = await userId(supabase)
  if (id) await supabase.from('profiles').update({ app_theme: t }).eq('id', id)
}

/** On sign-in and app load: use the account's choice here. An account that
 *  never chose adopts this browser's current one (so nobody's pick is lost). */
export async function syncThemeFromAccount(supabase: SupabaseClient) {
  const id = await userId(supabase)
  if (!id) return
  const { data, error } = await supabase.from('profiles').select('app_theme').eq('id', id).maybeSingle()
  if (error || !data) return // column not added yet, or no profile
  const saved = data.app_theme
  if (saved === 'system' || saved === 'light' || saved === 'dark') {
    if (saved !== readTheme()) applyTheme(saved)
  } else {
    await supabase.from('profiles').update({ app_theme: readTheme() }).eq('id', id)
  }
}
