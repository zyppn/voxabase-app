// Every unknown address in the app lands here. RootNotFound picks branded or
// neutral in the browser; reading the request here instead would make every
// page in the app render per request. Missing portals and owners under
// /<username>/ get app/[username]/not-found.tsx, decided on the server.
import RootNotFound from '@/app/_components/RootNotFound'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return <RootNotFound />
}
