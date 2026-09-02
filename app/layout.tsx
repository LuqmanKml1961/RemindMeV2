import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "../components/BottomNav";
import { PwaRegister } from "../components/PwaRegister";

export const metadata: Metadata = {
  title: "RemindMe",
  description: "A local-first reminder app. No accounts, no cloud.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RemindMe",
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
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-4 pt-6">{children}</main>
        <div className="mx-auto w-full max-w-lg">
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
