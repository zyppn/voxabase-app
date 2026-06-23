export default function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between bg-[#090909]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="h-7 w-32 bg-[#1e1e24] rounded-lg animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-40 bg-[#1e1e24] rounded-lg animate-pulse hidden md:block" />
          <div className="h-8 w-24 bg-[#1e1e24] rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-[#1e1e24] rounded-lg animate-pulse" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-[#1e1e24] rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-[#1e1e24] rounded-lg animate-pulse" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5">
              <div className="h-3 w-24 bg-[#1e1e24] rounded animate-pulse mb-3" />
              <div className="h-9 w-16 bg-[#1e1e24] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>

        {/* Portals header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-[#1e1e24] rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-[#1e1e24] rounded-lg animate-pulse" />
        </div>

        {/* Portal cards */}
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1e1e24] rounded-lg animate-pulse flex-shrink-0" />
                <div>
                  <div className="h-4 w-40 bg-[#1e1e24] rounded animate-pulse mb-2" />
                  <div className="h-3 w-56 bg-[#1e1e24] rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-12 bg-[#1e1e24] rounded animate-pulse" />
                <div className="h-6 w-16 bg-[#1e1e24] rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
