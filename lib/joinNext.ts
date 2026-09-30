// After sign-in or sign-up, send people back to a team invite they opened.
// Only /join/<token> is allowed, so this can't be used as an open redirect.
export function joinNext(): string | null {
  if (typeof window === 'undefined') return null
  const next = new URLSearchParams(window.location.search).get('next')
  return next && /^\/join\/[A-Za-z0-9_-]{10,100}$/.test(next) ? next : null
}
