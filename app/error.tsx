"use client";

import { useEffect } from "react";
import { BrutalButton } from "../components/Brutal";

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
      <p className="font-black uppercase tracking-tight text-accent-red">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-fg">
        An unexpected error occurred. Your data is still safe on this device.
        {error.digest ? <span className="block font-mono text-xs">Digest: {error.digest}</span> : null}
      </p>
      <BrutalButton onClick={retry}>Try again</BrutalButton>
    </div>
  );
}
