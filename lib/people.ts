// How a person is named in the app: business name, else full name; a long
// full name shortens to the first name. Email is the last resort.
export function displayName(p: { business_name?: string | null; full_name?: string | null; email?: string | null }) {
  const business = p.business_name?.trim()
  if (business) return business
  const full = p.full_name?.trim()
  if (full) return full.length > 18 ? full.split(/\s+/)[0] : full
  return p.email || 'Teammate'
}

/** Active in the last 3 minutes (the app checks in about once a minute). */
export const isOnline = (lastSeen: string | null | undefined) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 3 * 60_000
