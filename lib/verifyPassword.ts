// Client helper: returns null when the password is correct, otherwise a message to show.
export async function verifyPassword(password: string): Promise<string | null> {
  try {
    const res = await fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok && data.ok ? null : (data.error || 'Could not check your password. Try again.')
  } catch {
    return 'Could not check your password. Try again.'
  }
}
