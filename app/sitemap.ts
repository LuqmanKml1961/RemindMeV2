import type { MetadataRoute } from "next";

const BASE = "https://remind-me-v2.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the top-level public entry points are listed — the rest of the app is a local-first PWA
  // where all user data lives on-device and isn't part of the public web.
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/todo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/vault`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE}/settings`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
