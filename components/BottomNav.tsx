"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Vault, Settings } from "lucide-react";
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
    <nav className="grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("size-5", active && "text-primary")} />
            <span className={cn(active && "font-semibold")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
