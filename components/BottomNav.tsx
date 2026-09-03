"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Vault, Settings, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todo", label: "Todo", icon: ListChecks },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/import")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-t-0 lg:pb-0">
      <div className="hidden border-b px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-5 lg:flex lg:items-center lg:gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BellRing className="size-4" />
        </span>
        <span className="text-base font-semibold tracking-tight">RemindMe</span>
      </div>

      <div className="grid grid-cols-4 lg:grid-cols-1 lg:gap-1 lg:px-3 lg:py-3">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              transitionTypes={["nav-forward"]}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium transition-colors",
                "lg:flex-row lg:gap-3 lg:rounded-lg lg:px-3 lg:py-2.5 lg:text-sm",
                active
                  ? "text-primary lg:bg-primary/10 lg:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-primary")} />
              <span className={cn(active && "font-semibold")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
