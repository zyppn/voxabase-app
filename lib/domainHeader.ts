// Set by proxy.ts when a portal is opened on a customer's own domain.
export const DOMAIN_HEADER = 'x-vb-domain'

/** Voxabase's own addresses. Anything else is a customer's domain. */
export const OWN_HOST = /(^|\.)voxabase\.com$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/
