import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import { PwaRegister } from "../components/PwaRegister";
import { OfflineBanner } from "../components/OfflineBanner";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/ui/sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://remind-me-v2.vercel.app"),
  title: {
    default: "RemindMe — Local-first reminder app",
    template: "%s · RemindMe",
  },
  description:
    "A local-first reminder app. No accounts, no cloud. Reminders, medications, bills, vault, and to-dos stay entirely on your device.",
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
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b09" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PwaRegister />
          <OfflineBanner />
          <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-6">{children}</main>
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg">
            <BottomNav />
          </div>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
