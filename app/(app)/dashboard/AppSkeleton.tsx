// Loading states for signed-in pages. Inside the app the sidebar stays on
// screen, so pages and route loading files show only PageSkeleton: a body
// shaped like the page that's coming. AppSkeleton adds the sidebar and
// breadcrumb bar in outline, for when there's no app frame yet (the first load).
type Variant = 'dashboard' | 'detail' | 'form' | 'settings' | 'centered' | 'blank'

const bar = 'bg-ink-3 rounded-lg animate-pulse'

export default function AppSkeleton({ variant = 'dashboard' }: { variant?: Variant }) {
  return (
    <div className="vb-app min-h-screen bg-ink text-paper flex" aria-busy="true" aria-label="Loading">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-rule fixed inset-y-0 left-0 py-5 px-3">
        <div className="flex items-center justify-between px-1 mb-7 h-8">
          <img src="/vblogo.png" alt="" className="h-7 w-auto opacity-90" />
        </div>
        <div className={`h-9 mx-1 mb-2 ${bar}`} />
        <div className="h-px bg-ink-3 my-1.5 mx-2" />
        {[0, 1, 2].map(i => <div key={i} className={`h-9 mx-1 mt-1 ${bar} opacity-60`} />)}
        <div className="mt-auto px-1">
          <div className={`h-2 w-full mb-5 ${bar} opacity-60`} />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ink-3 animate-pulse" />
            <div className="flex-1"><div className={`h-3 w-24 mb-1.5 ${bar}`} /><div className={`h-2.5 w-32 ${bar} opacity-60`} /></div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:ml-60">
        {/* Mobile top bar + breadcrumb bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-rule">
          <img src="/vblogo.png" alt="" className="h-7 w-auto" />
          <div className={`h-8 w-20 ${bar}`} />
        </div>
        <div className="h-12 border-b border-rule flex items-center px-6 lg:px-10"><div className={`h-3 w-28 ${bar}`} /></div>

        <PageSkeleton variant={variant} />
      </div>
    </div>
  )
}

export function PageSkeleton({ variant = 'dashboard' }: { variant?: Variant }) {
  const card = 'border border-rule rounded-xl'
  return (
    <div aria-busy="true" aria-label="Loading">
      {variant === 'dashboard' && (
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
          <div className={`h-7 w-40 mb-2 ${bar}`} /><div className={`h-4 w-64 mb-8 ${bar} opacity-60`} />
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[0, 1, 2].map(i => <div key={i} className={`${card} px-4 py-3`}><div className={`h-2.5 w-16 mb-2 ${bar}`} /><div className={`h-5 w-20 ${bar}`} /></div>)}
          </div>
          <div className={`${card} divide-y divide-rule`}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-ink-3 animate-pulse" />
                <div className="flex-1"><div className={`h-3.5 w-48 mb-1.5 ${bar}`} /><div className={`h-2.5 w-32 ${bar} opacity-60`} /></div>
                <div className={`h-3 w-14 ${bar}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === 'detail' && (
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
          <div className={`h-7 w-72 mb-2 ${bar}`} /><div className={`h-4 w-96 max-w-full mb-6 ${bar} opacity-60`} />
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className={`${card} divide-y divide-rule`}>
              {[0, 1, 2].map(i => <div key={i} className="flex items-center gap-3 px-5 py-4"><div className="w-9 h-9 rounded-lg bg-ink-3 animate-pulse" /><div className={`h-3.5 w-52 ${bar}`} /></div>)}
            </div>
            <div className="flex flex-col gap-4">
              <div className={`${card} p-5`}><div className={`h-3.5 w-40 mb-3 ${bar}`} /><div className={`h-10 w-full ${bar} opacity-70`} /></div>
              <div className={`${card} p-5`}><div className={`h-3.5 w-24 mb-3 ${bar}`} /><div className={`h-10 w-full ${bar} opacity-70`} /></div>
            </div>
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="max-w-xl mx-auto px-6 lg:px-10 py-9">
          <div className={`h-7 w-56 mb-2 ${bar}`} /><div className={`h-4 w-80 max-w-full mb-8 ${bar} opacity-60`} />
          <div className={`${card} p-8 flex flex-col gap-5`}>
            {[0, 1, 2, 3].map(i => <div key={i}><div className={`h-3 w-28 mb-2 ${bar}`} /><div className={`h-10 w-full ${bar} opacity-70`} /></div>)}
          </div>
        </div>
      )}

      {variant === 'settings' && (
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
          <div className={`h-7 w-52 mb-2 ${bar}`} /><div className={`h-4 w-72 mb-7 ${bar} opacity-60`} />
          <div className="grid lg:grid-cols-2 gap-5">
            {[0, 1].map(i => <div key={i} className={`${card} p-6 h-72`}><div className={`h-4 w-28 mb-5 ${bar}`} /><div className={`h-10 w-full mb-4 ${bar} opacity-70`} /><div className={`h-10 w-full ${bar} opacity-70`} /></div>)}
          </div>
        </div>
      )}

      {variant === 'centered' && (
        <div className="max-w-md mx-auto px-6 py-16 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-ink-3 animate-pulse mb-6" />
          <div className={`h-6 w-64 mb-3 ${bar}`} /><div className={`h-4 w-80 max-w-full mb-8 ${bar} opacity-60`} />
          <div className={`w-full ${card} p-5 h-44`} />
        </div>
      )}
    </div>
  )
}
