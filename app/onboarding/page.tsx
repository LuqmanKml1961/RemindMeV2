"use client";

import { useRouter } from "next/navigation";
import { updatePreferences } from "../../lib/db/preferences";
import { requestNotificationPermissionAndSubscribe } from "../../lib/push/client";
import { BrutalButton, BrutalCard } from "../../components/Brutal";
import { PageTransition } from "../../components/PageTransition";

const FEATURES = [
  ["Time-based reminders", "Quick presets or a custom date & time. Repeat daily, weekly, monthly, yearly, or every N days."],
  ["Medical & health", "One entry can hold multiple medications, each with dosage and instructions."],
  ["Monthly bills", "Track an amount (RM) alongside the reminder."],
  ["Vault", "A quiet, searchable home for people, home & vehicle, and property details. No notifications, ever."],
  ["Share & import", "Share any reminder as a link — the recipient imports it instantly, on any device."],
];

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
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">RemindMe</h1>
          <p className="mt-2 text-sm text-muted-fg">Local-first. No accounts, no cloud. Everything stays on your device.</p>
        </div>

        <div className="flex flex-col gap-3">
          {FEATURES.map(([title, body]) => (
            <BrutalCard key={title}>
              <p className="font-bold uppercase">{title}</p>
              <p className="mt-1 text-sm text-muted-fg">{body}</p>
            </BrutalCard>
          ))}
        </div>

        <BrutalButton fill onClick={finish}>
          Get Started
        </BrutalButton>
      </div>
    </PageTransition>
  );
}
