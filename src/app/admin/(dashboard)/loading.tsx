export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Heading skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-[10px] bg-charcoal/10" />
        <div className="h-4 w-96 rounded-[8px] bg-charcoal/5" />
      </div>

      {/* Metric / Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-[16px] border border-charcoal/8 bg-paper/60 p-5"
          >
            <div className="h-3 w-20 rounded bg-charcoal/10" />
            <div className="mt-3 h-8 w-16 rounded bg-charcoal/15" />
          </div>
        ))}
      </div>

      {/* Main content table/panel skeleton */}
      <div className="rounded-[18px] border border-charcoal/10 bg-paper/80 p-6">
        <div className="h-5 w-36 rounded bg-charcoal/10" />
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full rounded-[10px] bg-charcoal/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
