import { Suspense } from 'react'
import StripeSetupContent from './StripeSetupContent'
import { PageSkeleton } from '../dashboard/AppSkeleton'

export const metadata = { title: 'Connect Stripe · Voxabase' }

export default function StripeSetupPage() {
  return (
    <Suspense fallback={
      <PageSkeleton variant="centered" />
    }>
      <StripeSetupContent />
    </Suspense>
  )
}