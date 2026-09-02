import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Internal, user-specific and share-link-import endpoints don't need indexing.
      disallow: ["/api/", "/import"],
    },
    sitemap: "https://remind-me-v2.vercel.app/sitemap.xml",
  };
}
