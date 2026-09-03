import Link from "next/link";
import { Button } from "../components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold tracking-tight">404</p>
      <p className="max-w-sm text-sm text-muted-foreground">That page doesn&apos;t exist or was removed.</p>
      <Button render={<Link href="/" />} className="mt-2">
        <Home /> Back home
      </Button>
    </div>
  );
}
