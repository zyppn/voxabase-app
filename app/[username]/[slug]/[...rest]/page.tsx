// Deeper addresses under a portal (/<username>/<slug>/anything) don't exist.
// Sending them here keeps them on the /<username>/ 404, which stays neutral on
// customer domains.
import { notFound } from 'next/navigation'

export default function NoSuchPage() {
  notFound()
}
