"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPreferences, updatePreferences } from "../../lib/db/preferences";
import { getNotificationReadiness, hasActiveSubscription, requestNotificationPermissionAndSubscribe, type NotificationReadiness } from "../../lib/push/client";
import { BrutalButton, BrutalCard } from "../../components/Brutal";
import { PageTransition } from "../../components/PageTransition";

const STATUS_COPY: Record<NotificationReadiness, string> = {
  unsupported: "Not supported in this browser.",
  "needs-install": "Add RemindMe to your Home Screen first (Share → Add to Home Screen), then come back here.",
  "needs-permission": "Not enabled yet.",
  denied: "Blocked — enable notifications for this site in your browser settings.",
  "not-configured": "Something went wrong enabling push on this device. Try again — if it keeps failing, the server may not be configured correctly.",
  ready: "Enabled. Reminders will notify you even if you close the app.",
};

export default function SettingsPage() {
  const router = useRouter();
  const [autoDeleteDefault, setAutoDeleteDefault] = useState(false);
  const [status, setStatus] = useState<NotificationReadiness>(() =>
    typeof window === "undefined" ? "needs-permission" : getNotificationReadiness()
  );

  useEffect(() => {
    getPreferences().then((p) => setAutoDeleteDefault(p.autoDeleteDefault));
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    hasActiveSubscription().then((has) => {
      if (!has) setStatus("needs-permission");
    });
    // Only verify the initial "ready" read from getNotificationReadiness() on mount — not every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleAutoDelete(value: boolean) {
    setAutoDeleteDefault(value);
    await updatePreferences({ autoDeleteDefault: value });
  }

  async function enableNotifications() {
    const result = await requestNotificationPermissionAndSubscribe();
    setStatus(result);
  }

  async function replayGuide() {
    await updatePreferences({ hasSeenOnboarding: false });
    router.push("/onboarding");
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">Settings</h1>

        <BrutalCard>
          <p className="font-bold uppercase">Notifications</p>
          <p className="mt-1 text-sm text-muted-fg">{STATUS_COPY[status]}</p>
          {status !== "ready" && status !== "unsupported" && (
            <BrutalButton fill className="mt-3 w-full" onClick={enableNotifications}>
              Enable Notifications
            </BrutalButton>
          )}
        </BrutalCard>

        <BrutalCard className="flex items-center justify-between">
          <div>
            <p className="font-bold uppercase">Auto-delete completed</p>
            <p className="mt-1 text-sm text-muted-fg">Default for new reminders.</p>
          </div>
          <input
            type="checkbox"
            checked={autoDeleteDefault}
            onChange={(e) => toggleAutoDelete(e.target.checked)}
            className="h-5 w-5 accent-accent-green"
          />
        </BrutalCard>

        <BrutalButton onClick={replayGuide}>Replay Guide</BrutalButton>

        <p className="mt-4 text-center text-xs text-muted-fg">
          Everything stays on your device. No accounts, no cloud.
        </p>
      </div>
    </PageTransition>
  );
}
