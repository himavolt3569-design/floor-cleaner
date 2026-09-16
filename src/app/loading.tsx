/**
 * Skeleton that matches the hero's real proportions, so the page does not jump
 * when the content arrives.
 */
export default function Loading() {
  return (
    <div className="bg-ivory">
      <div className="h-8 bg-charcoal" />
      <div className="h-[68px] border-b border-transparent" />
      <div className="shell">
        <div className="grid items-center gap-y-12 pb-20 pt-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-6">
            <Bar className="h-3 w-40" />
            <Bar className="mt-6 h-14 w-[85%]" />
            <Bar className="mt-3 h-14 w-[70%]" />
            <Bar className="mt-3 h-14 w-[45%]" />
            <Bar className="mt-8 h-4 w-[80%]" />
            <Bar className="mt-2.5 h-4 w-[72%]" />
            <Bar className="mt-9 h-[52px] w-56 rounded-[14px]" />
          </div>
          <div className="lg:col-span-6">
            <div className="mx-auto h-[clamp(19rem,46vw,37rem)] w-full max-w-[26rem] rounded-[26px] bg-stone/70 lg:max-w-none" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading TMG Cleaner
      </span>
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return <div className={`rounded-[6px] bg-stone/70 ${className ?? ""}`} />;
}
