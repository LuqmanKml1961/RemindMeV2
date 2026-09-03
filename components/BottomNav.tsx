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

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (pathname.startsWith("/onboarding") || pathname.startsWith("/import")) return null;

  const toggleCollapsed = () => persistCollapsed(!collapsed);

  return (
    <>
      {/* Mobile / tablet — floating bottom pill, seated above the home indicator */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] lg:hidden"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-4 rounded-2xl border bg-card p-1.5 shadow-lg shadow-black/10">
          {ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={["nav-forward"]}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[0.7rem] font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop — left sidebar rail (collapsible) */}
      <nav
        aria-label="Primary"
        className={cn(
          "hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:shrink-0 lg:flex-col lg:border-r",
          "lg:w-60 lg:transition-[width] lg:duration-200",
          collapsed && "lg:w-16"
        )}
      >
        <div
          className={cn(
            "flex border-b pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-5 lg:items-center",
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

        <div className={cn("flex flex-col gap-1 py-3", collapsed ? "px-2" : "px-3")}>
          {ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={["nav-forward"]}
                className={cn(
                  "flex flex-row items-center gap-3 rounded-lg py-2.5 text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span className={cn("truncate", active && "font-semibold")}>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
