import { Suspense } from 'react'
import StripeSetupContent from './StripeSetupContent'

export default function StripeSetupPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <StripeSetupContent />
    </Suspense>
  )
}