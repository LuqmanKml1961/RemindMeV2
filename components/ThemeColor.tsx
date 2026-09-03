"use client";

import * as React from "react";
import { useTheme } from "next-themes";

const COLORS: Record<string, string> = {
  light: "#fdfcf9",
  dark: "#080706",
};

const TAG_ID = "theme-color-dynamic";

/**
 * Keeps the mobile browser/PWA status + navigation bar color in sync with the
 * active app theme. Chrome Android reads the `theme-color` meta tag live, so
 * this removes the static light/dark gutter that appears when the OS bar color
 * (from /manifest.webmanifest) doesn't match the app background.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();

  React.useLayoutEffect(() => {
    const color = COLORS[resolvedTheme ?? "light"] ?? COLORS.light;
    let meta = document.getElementById(TAG_ID) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.id = TAG_ID;
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
