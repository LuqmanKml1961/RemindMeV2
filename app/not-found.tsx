import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-black uppercase tracking-tight">404</p>
      <p className="max-w-sm text-sm text-muted-fg">That page doesn&apos;t exist or was removed.</p>
      <Link
        href="/"
        className="mt-2 border-2 border-border bg-fg px-6 py-2 font-bold uppercase tracking-wide text-bg"
      >
        Back home
      </Link>
    </div>
  );
}
