"use client";

import { useRouter } from "next/navigation";
import { updatePreferences } from "../../lib/db/preferences";
import { requestNotificationPermissionAndSubscribe } from "../../lib/push/client";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { PageTransition } from "../../components/PageTransition";
import { Bell, Pill, Wallet, Shield, Share2 } from "lucide-react";

const FEATURES = [
  ["Time-based reminders", "Quick presets or a custom date & time. Repeat daily, weekly, monthly, yearly, or every N days.", Bell],
  ["Medical & health", "One entry can hold multiple medications, each with dosage and instructions.", Pill],
  ["Monthly bills", "Track an amount (RM) alongside the reminder.", Wallet],
  ["Vault", "A quiet, searchable home for people, home & vehicle, and property details. No notifications, ever.", Shield],
  ["Share & import", "Share any reminder as a link — the recipient imports it instantly, on any device.", Share2],
] as const;

export default function OnboardingPage() {
  const router = useRouter();

  async function finish() {
    await requestNotificationPermissionAndSubscribe().catch(() => undefined);
    await updatePreferences({ hasSeenOnboarding: true });
    router.replace("/", { transitionTypes: ["nav-forward"] });
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        <div className="space-y-2 py-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">RemindMe</h1>
          <p className="text-muted-foreground">Local-first. No accounts, no cloud. Everything stays on your device.</p>
        </div>

        <div className="flex flex-col gap-3">
          {FEATURES.map(([title, body, Icon]) => (
            <Card key={title}>
              <CardHeader className="flex-row items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="mt-0.5">{body}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={finish}>
          Get Started
        </Button>
      </div>
    </PageTransition>
  );
}
