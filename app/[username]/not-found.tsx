// Not found under /<username>/…: a missing portal or owner. On a customer's
// own domain (every request there is rewritten under /<username>/) it stays
// neutral, since their clients are the ones seeing it.
import { headers } from 'next/headers'
import { DOMAIN_HEADER } from '@/lib/domainHeader'
import { BrandedNotFound, NeutralNotFound } from '@/app/_components/NotFoundView'

export const metadata = { title: 'Page not found' }

export default async function NotFound() {
  const onCustomDomain = !!(await headers()).get(DOMAIN_HEADER)
  return onCustomDomain ? <NeutralNotFound /> : <BrandedNotFound />
}
