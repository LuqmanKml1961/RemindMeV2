"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getPreferences, updatePreferences } from "../../lib/db/preferences";
import { getNotificationReadiness, hasActiveSubscription, requestNotificationPermissionAndSubscribe, type NotificationReadiness } from "../../lib/push/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { PageTransition } from "../../components/PageTransition";
import { Bell, RotateCcw, BellOff } from "lucide-react";
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
  const { resolvedTheme, setTheme } = useTheme();
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

  const isDark = resolvedTheme === "dark";

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Make RemindMe yours.</p>
        </div>

        <Card>
          <CardContent className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {status === "ready" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">Notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">{STATUS_COPY[status]}</p>
              {status !== "ready" && status !== "unsupported" && (
                <Button className="mt-3" onClick={enableNotifications}>
                  Enable Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Auto-delete completed</p>
              <p className="mt-1 text-sm text-muted-foreground">Default for new reminders.</p>
            </div>
            <Switch checked={autoDeleteDefault} onCheckedChange={toggleAutoDelete} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Dark mode</p>
              <p className="mt-1 text-sm text-muted-foreground">Follows your system by default.</p>
            </div>
            <Switch checked={isDark} onCheckedChange={(dark) => setTheme(dark ? "dark" : "light")} />
          </CardContent>
        </Card>

        <Button variant="outline" onClick={replayGuide}>
          <RotateCcw /> Replay Guide
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Everything stays on your device. No accounts, no cloud.
        </p>
      </div>
    </PageTransition>
  );
}
