export default function PortalDetailSkeleton() {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <nav className="border-b border-rule px-8 py-4 flex items-center justify-between sticky top-0 bg-ink/80 backdrop-blur-sm z-10">
        <div className="h-7 w-32 bg-ink-3 rounded-lg animate-pulse" />
        <div className="h-5 w-32 bg-ink-3 rounded-lg animate-pulse" />
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Portal header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 mr-4">
            <div className="h-8 w-56 bg-ink-3 rounded-lg animate-pulse mb-3" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-64 bg-ink-3 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-ink-3 rounded-full animate-pulse" />
              <div className="h-6 w-16 bg-ink-3 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-ink-3 rounded-lg animate-pulse" />
            <div className="h-8 w-16 bg-ink-3 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Files ready toggle */}
        <div className="bg-ink-2 border border-rule rounded-xl p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="h-4 w-32 bg-ink-3 rounded animate-pulse mb-2" />
            <div className="h-3 w-64 bg-ink-3 rounded animate-pulse" />
          </div>
          <div className="h-7 w-12 bg-ink-3 rounded-full animate-pulse ml-4" />
        </div>

        {/* Files section */}
        <div className="bg-ink-2 border border-rule rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-rule flex items-center justify-between">
            <div className="h-4 w-16 bg-ink-3 rounded animate-pulse" />
            <div className="h-7 w-24 bg-ink-3 rounded-lg animate-pulse" />
          </div>
          <div className="divide-y divide-rule">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-ink-3 rounded-lg animate-pulse flex-shrink-0" />
                  <div>
                    <div className="h-4 w-48 bg-ink-3 rounded animate-pulse mb-1.5" />
                    <div className="h-3 w-16 bg-ink-3 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-7 w-12 bg-ink-3 rounded-lg animate-pulse" />
                  <div className="h-7 w-16 bg-ink-3 rounded-lg animate-pulse" />
                  <div className="h-7 w-14 bg-ink-3 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice section */}
        <div className="bg-ink-2 border border-rule rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-5 w-20 bg-ink-3 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-ink-3 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 bg-ink-3 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-ink-3 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
