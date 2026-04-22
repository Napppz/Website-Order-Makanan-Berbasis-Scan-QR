export default function CashierLoading() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[28px] bg-white/80 ring-1 ring-stone-200"
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-48 animate-pulse rounded-[28px] bg-white/80 ring-1 ring-stone-200" />
        <div className="h-48 animate-pulse rounded-[28px] bg-white/80 ring-1 ring-stone-200" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-72 animate-pulse rounded-[28px] bg-white/80 ring-1 ring-stone-200" />
        <div className="h-72 animate-pulse rounded-[28px] bg-white/80 ring-1 ring-stone-200" />
      </section>
    </div>
  );
}
