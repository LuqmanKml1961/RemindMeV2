import Link from "next/link";

// Served by the service worker when a navigation fails while offline. Kept deliberately minimal
// and dependency-free so it always renders from cache.
export const metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-black uppercase tracking-tight">Offline</h1>
      <p className="max-w-sm text-sm text-muted-fg">
        You&apos;re not connected right now, but your reminders are safe on this device. They&apos;ll
        notify you here once you&apos;re back online.
      </p>
      <Link
        href="/"
        className="mt-2 border-2 border-border bg-fg px-6 py-2 font-bold uppercase tracking-wide text-bg"
      >
        Try again
      </Link>
    </div>
  );
}
