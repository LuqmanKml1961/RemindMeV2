export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2" aria-busy="true">
      <div className="h-12 w-12 animate-pulse border-2 border-border bg-card" />
      <p className="text-sm font-bold uppercase tracking-wide text-muted-fg">Loading…</p>
    </div>
  );
}
