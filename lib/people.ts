type Named = { business_name?: string | null; full_name?: string | null; username?: string | null; email?: string | null }

/** Shortest a full name can be (signup and settings both enforce it). */
export const MIN_NAME_LENGTH = 3

// How a person is named in the app: their full name (a long one shortens to
// the first name). Email is the last resort.
export function displayName(p: Named) {
  const full = p.full_name?.trim()
  if (full) return full.length > 18 ? full.split(/\s+/)[0] : full
  return p.email || 'Teammate'
}

// How a workspace owner's team is named: business name, else their full name.
export function teamName(p: Named) {
  return p.business_name?.trim() || p.full_name?.trim() || p.username || p.email || 'Team'
}

// Team dashboard heading: the business name on its own, else the owner's
// first name, as in "Jacob's team portals".
export function teamHeading(p: Named) {
  const business = p.business_name?.trim()
  if (business) return business
  const first = p.full_name?.trim().split(/\s+/)[0]
  return `${first || teamName(p)}'s team portals`
}

/** Active in the last 3 minutes (the app checks in about once a minute). */
export const isOnline = (lastSeen: string | null | undefined) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 3 * 60_000
