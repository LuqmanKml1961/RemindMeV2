import Link from "next/link";
import { Button } from "../../components/ui/button";
import { WifiOff } from "lucide-react";

// Served by the service worker when a navigation fails while offline. Kept deliberately minimal
// and dependency-free so it always renders from cache.
export const metadata = {
  title: "You're offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        You&apos;re not connected right now, but your reminders are safe on this device. They&apos;ll
        notify you here once you&apos;re back online.
      </p>
      <Button render={<Link href="/" />} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
