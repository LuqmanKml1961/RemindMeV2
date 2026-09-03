"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Home, ListChecks, Vault, Settings, BellRing, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/todo", label: "Todo", icon: ListChecks },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "remindme-sidebar-collapsed";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function getSnapshot(): boolean {
  if (cached !== null) return cached;
  try {
    cached = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) === "1" : false;
  } catch {
    cached = false;
  }
  return cached;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function persistCollapsed(value: boolean) {
  cached = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore — storage may be unavailable (e.g. private mode)
  }
  listeners.forEach((cb) => cb());
}

export function BottomNav() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/import")) return null;

  const toggleCollapsed = () => persistCollapsed(!collapsed);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80",
        "lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:shrink-0 lg:flex-col lg:border-r lg:border-t-0 lg:pb-0",
        "lg:w-60 lg:transition-[width] lg:duration-200",
        collapsed && "lg:w-16"
      )}
    >
      <div
        className={cn(
          "hidden border-b pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-5 lg:flex lg:items-center",
          collapsed ? "lg:justify-center lg:px-2" : "lg:justify-between lg:px-4"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BellRing className="size-4" />
          </span>
          {!collapsed && <span className="text-base font-semibold tracking-tight">RemindMe</span>}
        </span>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <div className={cn("grid grid-cols-4 lg:grid-cols-1 lg:gap-1 lg:py-3", collapsed ? "lg:px-2" : "lg:px-3")}>
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
                "lg:flex-row lg:gap-3 lg:rounded-lg lg:py-2.5 lg:text-sm",
                collapsed ? "lg:justify-center lg:px-0" : "lg:px-3",
                active
                  ? "text-primary lg:bg-primary/10 lg:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-primary")} />
              {!collapsed && <span className={cn(active && "font-semibold")}>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
