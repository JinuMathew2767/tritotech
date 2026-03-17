export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div
      className={`${sizeMap[size]} border-4 border-[#0f7cb8]/18 border-t-[#163b63] rounded-full animate-spin`}
    />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3 p-4">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="h-3 w-1/2 rounded bg-slate-100" />
      <div className="h-3 w-2/3 rounded bg-slate-100" />
    </div>
  )
}
