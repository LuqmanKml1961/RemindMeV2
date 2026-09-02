"use client";

import { ViewTransition } from "react";

// Wraps page content in a directional View Transition. Navigation tagged with `nav-forward` /
// `nav-back` (via <Link transitionTypes> or router.push with transitionTypes) slides content
// left/right; browser back/forward and untagged navigations fall back to no directional motion.
// Falls back to a plain wrapper (no-op) where the View Transitions API isn't supported.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "auto",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "auto",
      }}
      default="auto"
    >
      {children}
    </ViewTransition>
  );
}
