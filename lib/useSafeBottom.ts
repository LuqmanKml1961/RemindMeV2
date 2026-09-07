"use client";

import { useEffect, useState } from "react";

// iOS standalone PWA (WebKit) bug: a `fixed` element at `bottom: 0` anchors to
// the CONTENT viewport bottom, not the physical screen bottom, when the app is
// opened as an installed Home Screen app. CSS `bottom: 0` / `pb-0` therefore
// still leaves a visible gap between the bottom nav and the home indicator.
//
// `env(safe-area-inset-bottom)` reports 0 in this context, so it can't be used
// to compensate. Instead we measure the real omitted inset by comparing the
// physical screen height to the content viewport height, and return that value
// so the caller can apply a negative `bottom` offset to reach the screen edge.
export function useSafeBottom(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only iOS WebKit has this bug - skip everything else so a false reading
    // can't push the bar off-screen on Android/desktop.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) return;

    const measure = () => {
      // On iOS, window.screen.height is reported in CSS pixels (e.g. 812 on
      // iPhone X portrait) = the physical screen height. window.innerHeight is
      // the content viewport, inset-reduced by the home indicator in the
      // installed-PWA bug. The difference is the gap to compensate.
      const physical = window.screen.height;
      const content = window.innerHeight;
      const gap = Math.max(0, Math.round(physical - content));
      setOffset(gap > 1 ? Math.min(gap, 60) : 0);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return offset;
}
