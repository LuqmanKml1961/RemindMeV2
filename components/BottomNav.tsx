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
      {/* Mobile / tablet — floating bottom pill, anchored with bottom-0 and PADDED
          up above the iOS home indicator (Apple safe-area pattern):
          - The outer <nav> is fixed bottom-0 (anchored flush to the physical
            bottom). Its bottom PADDING is calc(env(safe-area-inset-bottom) +
            12px): the safe-area inset clears the iOS home pill, and the +12px
            is the intentional float gap so the capsule looks like it hovers.
          - On Android/desktop env(safe-area-inset-bottom) is 0, so this is
            just 12px of float spacing - no platform breaks.
          - Padding (not margin, not a negative/bottom offset) is what pushes
            the capsule up into the safe zone for a floating capsule design.
          - CALC VALIDITY: whitespace around + is REQUIRED in calc() - must be
            "calc(env(safe-area-inset-bottom) + 12px)", never "+12px" without
            spaces (invalid CSS drops the whole declaration). This is done as
            an inline style on purpose to avoid Tailwind arbitrary-value
            parsing of calc(). pb-0 stays in the class as the fallback.
          - Do NOT reintroduce: negative bottom, JS screen.height-innerHeight
            (nav vanished / clipped on iPhone 17 Pro), or bare -env(...)
            (invalid CSS, dropped bottom -> nav jumped to the top).
          - Test on BOTH a notched iPhone (installed PWA) and an Android phone
            before committing - see README "Platform UI notes". */}
      <nav
        aria-label="Primary"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        className="fixed inset-x-0 bottom-0 z-40 px-2 pb-0 lg:hidden"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-2xl border bg-card px-1.5 pb-2 pt-1.5 shadow-lg shadow-black/10">
          {ITEMS.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={["nav-forward"]}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-xl px-1 text-[0.7rem] font-medium transition-colors duration-200",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center transition-transform duration-200",
                    active && "translate-y-[-4px]"
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <span
                  className={cn(
                    "pointer-events-none absolute right-0 bottom-0.5 left-0 flex justify-center leading-none transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop — left sidebar rail (collapsible) */}
      <nav
        aria-label="Primary"
        className={cn(
          "relative hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:shrink-0 lg:flex-col lg:border-r",
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
        </div>
        {/* Collapse toggle — sits on the outside edge of the rail so it never
            looks like part of the collapsed section */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-[calc(env(safe-area-inset-top)+2.75rem)] z-20 flex size-6 shrink-0 items-center justify-center",
            "rounded-full border bg-background text-muted-foreground shadow-sm",
            "transition-colors hover:bg-muted hover:text-foreground"
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>

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
