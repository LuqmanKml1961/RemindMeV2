"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { TriangleAlert } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <p className="font-semibold">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Your data is still safe on this device.
        {error.digest ? <span className="mt-1 block text-xs font-mono">Digest: {error.digest}</span> : null}
      </p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
