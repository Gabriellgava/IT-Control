// ============================================================
// PageSkeleton.tsx — Skeleton de carregamento da página
// ============================================================

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-64 bg-slate-200 rounded-lg" />
      <div className="h-4 w-96 bg-slate-100 rounded" />

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-xl" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
          </div>
          {/* Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-2">
                <div className="h-3.5 w-24 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Button skeletons */}
      <div className="flex gap-3 justify-end pt-2">
        <div className="h-11 w-28 bg-slate-100 rounded-xl" />
        <div className="h-11 w-44 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
