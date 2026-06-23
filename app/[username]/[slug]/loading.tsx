export default function Loading() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between">
        <div className="h-7 w-32 bg-[#1e1e24] rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-[#1e1e24] rounded-lg animate-pulse" />
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="h-3 w-32 bg-[#1e1e24] rounded animate-pulse mb-3" />
          <div className="h-8 w-64 bg-[#1e1e24] rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-48 bg-[#1e1e24] rounded animate-pulse" />
        </div>
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-[#1e1e24]">
            <div className="h-4 w-24 bg-[#1e1e24] rounded animate-pulse" />
          </div>
          <div className="divide-y divide-[#1e1e24]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#1e1e24] rounded-lg animate-pulse" />
                  <div>
                    <div className="h-4 w-40 bg-[#1e1e24] rounded animate-pulse mb-1.5" />
                    <div className="h-3 w-20 bg-[#1e1e24] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-[#1e1e24] rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1e1e24]">
            <div className="h-4 w-16 bg-[#1e1e24] rounded animate-pulse" />
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="h-5 w-32 bg-[#1e1e24] rounded animate-pulse mb-2" />
                <div className="h-4 w-40 bg-[#1e1e24] rounded animate-pulse" />
              </div>
              <div className="h-8 w-24 bg-[#1e1e24] rounded-lg animate-pulse" />
            </div>
            <div className="h-14 w-full bg-[#1e1e24] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}
