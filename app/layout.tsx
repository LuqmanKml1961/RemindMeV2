import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import { PwaRegister } from "../components/PwaRegister";
import { OfflineBanner } from "../components/OfflineBanner";
import { ThemeProvider } from "../components/theme-provider";
import { ThemeColor } from "../components/ThemeColor";
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeColor />
          <PwaRegister />
          <OfflineBanner />
          <div className="lg:flex lg:min-h-[100dvh]">
            <BottomNav />
            <main className="w-full px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-28 sm:px-6 lg:flex-1 lg:px-8 lg:pb-12 xl:px-12">
              <div className="mx-auto w-full max-w-3xl">
                {children}
              </div>
            </main>
          </div>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
