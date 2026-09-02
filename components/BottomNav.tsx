"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/todo", label: "Todo" },
  { href: "/vault", label: "Vault" },
  { href: "/settings", label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/import")) return null;

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t-2 border-border bg-bg">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-r-2 border-border py-3 text-center text-xs font-bold uppercase tracking-wide last:border-r-0 ${
              active ? "bg-fg text-bg" : "text-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
