// The Help center's table of contents (order = sidebar order).
export type Doc = { slug: string; title: string; blurb: string; group: string; plan?: 'Pro' | 'Agency' }

export const DOCS: Doc[] = [
  { group: 'Start here', slug: 'getting-started', title: 'Getting started', blurb: 'Create your first portal, add files and send the link.' },
  { group: 'Start here', slug: 'for-clients', title: 'What your clients see', blurb: 'The client side of a portal, and what they can and can’t do.' },
  { group: 'Getting paid', slug: 'payments', title: 'Invoices & payments', blurb: 'Connect Stripe, add an invoice, and how payouts and fees work.' },
  { group: 'Portals', slug: 'private-portals', title: 'Password-protected portals', blurb: 'Lock a portal so only people with the password can open it.', plan: 'Pro' },
  { group: 'Portals', slug: 'branding', title: 'Branding', blurb: 'Your logo and color on every portal.', plan: 'Pro' },
  { group: 'Portals', slug: 'client-approvals', title: 'Client approvals', blurb: 'Let clients approve a delivery or request changes.', plan: 'Agency' },
  { group: 'Teams', slug: 'teams', title: 'Teams & workspaces', blurb: 'Invite teammates, share a Team workspace, move portals.', plan: 'Pro' },
  { group: 'Teams', slug: 'custom-domain', title: 'Set up your portal domain', blurb: 'Send portals from files.yourstudio.com.', plan: 'Agency' },
  { group: 'Account', slug: 'billing', title: 'Plans & billing', blurb: 'Upgrade, switch to annual, cancel, and what each plan includes.' },
  { group: 'Account', slug: 'security', title: 'Account security', blurb: 'Two-step verification, sessions and keeping your account safe.' },
]

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug)
