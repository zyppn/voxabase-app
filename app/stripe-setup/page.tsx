import { Suspense } from 'react'
import StripeSetupContent from './StripeSetupContent'
import AppSkeleton from '../dashboard/AppSkeleton'

export const metadata = { title: 'Connect Stripe · Voxabase' }

export default function StripeSetupPage() {
  return (
    <Suspense fallback={
      <AppSkeleton variant="centered" />
    }>
      <StripeSetupContent />
    </Suspense>
  )
}