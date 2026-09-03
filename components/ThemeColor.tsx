"use client";

import * as React from "react";
import { useTheme } from "next-themes";

const COLORS: Record<string, string> = {
  light: "#ffffff",
  dark: "#000000",
};

/**
 * Keeps the mobile PWA status + navigation bar color in sync with the ACTIVE
 * app theme (not just the OS scheme). Chrome Android reads the `theme-color`
 * meta tag live. This must be the ONLY theme-color in the document — a
 * media-query tag tied to the OS scheme can otherwise override it when the
 * in-app theme differs from the OS theme.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();

  React.useLayoutEffect(() => {
    const color = COLORS[resolvedTheme ?? "light"] ?? COLORS.light;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
