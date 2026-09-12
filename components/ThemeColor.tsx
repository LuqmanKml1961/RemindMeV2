"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// Matches --background in app/globals.css for each theme.
const THEME_COLOR = { light: "#faf9f7", dark: "#0c0b09" } as const;

// Keeps the single <meta name="theme-color"> equal to the app background of the theme actually
// in use. In a standalone PWA Android paints the status bar with this colour, so it must follow
// the resolved theme rather than rely on media-query variants of the tag.
export function ThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_COLOR[resolvedTheme === "dark" ? "dark" : "light"];
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
