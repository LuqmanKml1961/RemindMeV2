import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import { PwaRegister } from "../components/PwaRegister";
import { OfflineBanner } from "../components/OfflineBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://remind-me-v2.vercel.app"),
  title: {
    default: "RemindMe — Local-first reminder app",
    template: "%s · RemindMe",
  },
  description: "A local-first reminder app. No accounts, no cloud. Reminders, medications, bills, vault, and to-dos stay entirely on your device.",
  manifest: "/manifest.webmanifest",
  applicationName: "RemindMe",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RemindMe",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "RemindMe",
    title: "RemindMe — Local-first reminder app",
    description: "A local-first reminder app. No accounts, no cloud.",
    url: "https://remind-me-v2.vercel.app",
  },
  twitter: {
    card: "summary",
    title: "RemindMe — Local-first reminder app",
    description: "A local-first reminder app. No accounts, no cloud.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <PwaRegister />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-4 pt-6">{children}</main>
        <div className="mx-auto w-full max-w-lg">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
