// Appearance: System (follows the device), Light or Dark. Saved per browser.
// The choice lives on <html data-theme>; CSS turns it into color-scheme, and
// every color token picks its light or dark value with light-dark().
// THEME_SCRIPT runs in <head> before the page paints, so there's no flash.
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
