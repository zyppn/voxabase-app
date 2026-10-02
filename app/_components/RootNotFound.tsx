'use client'
// The app-wide 404 picks its look in the browser, from the address it's on:
// branded on Voxabase's own addresses, neutral on a customer's domain. Next.js
// embeds this page in every page's data, so deciding here (not on the server)
// keeps Voxabase wording out of customer-domain pages entirely, and lets the
// app's fixed pages (help, sign-in, legal) be prebuilt.
import { useSyncExternalStore } from 'react'
import { OWN_HOST } from '@/lib/domainHeader'
import { BrandedNotFound, NeutralNotFound } from './NotFoundView'

const noop = () => () => {}

export default function RootNotFound() {
  const host = useSyncExternalStore(noop, () => window.location.hostname, () => null)
  if (host === null) return <main className="min-h-screen bg-ink" aria-busy="true" />
  return OWN_HOST.test(host) ? <BrandedNotFound /> : <NeutralNotFound />
}
