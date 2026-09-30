// Mirrors the portal card so the page doesn't jump when it loads.
export default function Loading() {
  const bar = 'animate-pulse rounded bg-ink-3'
  return (
    <main className="min-h-screen bg-ink">
      <div className="mx-auto w-full max-w-[640px] px-4 py-8 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-[14px] border border-rule bg-ink-2">
          <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
            <div className="flex items-center gap-2.5"><div className={`h-7 w-7 ${bar} rounded-lg`} /><div className={`h-4 w-28 ${bar}`} /></div>
            <div className={`h-3 w-14 ${bar}`} />
          </div>
          <div className="px-5 pb-3.5 pt-5">
            <div className={`mb-3 h-3 w-36 ${bar}`} />
            <div className={`mb-2 h-6 w-60 ${bar}`} />
            <div className={`h-3 w-32 ${bar}`} />
          </div>
          <div className="grid gap-1.5 px-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] border border-rule bg-ink px-2.5 py-[9px]">
                <div className={`h-[38px] w-[38px] ${bar} rounded-lg`} />
                <div className={`h-4 flex-1 ${bar}`} />
                <div className={`h-8 w-24 ${bar} rounded-[7px]`} />
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-rule px-5 py-[18px]">
            <div className="mb-4 flex items-end justify-between">
              <div><div className={`mb-2 h-3 w-16 ${bar}`} /><div className={`h-4 w-40 ${bar}`} /></div>
              <div className={`h-7 w-28 ${bar}`} />
            </div>
            <div className={`h-12 w-full ${bar} rounded-[10px]`} />
          </div>
        </div>
      </div>
    </main>
  )
}
