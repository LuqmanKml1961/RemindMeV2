"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getPreferences, updatePreferences } from "../../lib/db/preferences";
import { retryPendingSchedules } from "../../lib/db/reminders";
import { getNotificationReadiness, hasActiveSubscription, requestNotificationPermissionAndSubscribe, type NotificationReadiness } from "../../lib/push/client";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { PageTransition } from "../../components/PageTransition";
import { Bell, RotateCcw, BellOff } from "lucide-react";

// Notification.permission can be "granted" without a live subscription ever having been saved, so
// a "ready" readiness is only trusted once hasActiveSubscription() confirms it.
async function resolveReadiness(): Promise<NotificationReadiness> {
  const readiness = getNotificationReadiness();
  if (readiness !== "ready") return readiness;
  return (await hasActiveSubscription()) ? "ready" : "needs-permission";
}

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
  // Readiness depends on browser APIs, so it is resolved after mount: the prerendered HTML and the
  // first client render must agree, otherwise React reports a hydration mismatch on this page.
  const [status, setStatus] = useState<NotificationReadiness>("needs-permission");
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    getPreferences().then((p) => setAutoDeleteDefault(p.autoDeleteDefault));
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveReadiness().then((readiness) => {
      if (!cancelled) setStatus(readiness);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleAutoDelete(value: boolean) {
    try {
      await updatePreferences({ autoDeleteDefault: value });
      setAutoDeleteDefault(value);
    } catch (err) {
      console.error("Failed to update auto-delete default", err);
      toast.error("Couldn't update the setting. Please try again.");
    }
  }

  async function enableNotifications() {
    if (enabling) return;
    setEnabling(true);
    try {
      const result = await requestNotificationPermissionAndSubscribe();
      setStatus(result);
      if (result === "ready") {
        toast.success("Notifications enabled");
        // Reminders created before push was enabled (or while offline) may have missed their
        // server-side schedule — push them through now.
        const synced = await retryPendingSchedules().catch(() => 0);
        if (synced > 0) toast.success(`${synced} reminder${synced === 1 ? "" : "s"} scheduled for push`);
      }
    } catch (err) {
      console.error("Failed to enable notifications", err);
      toast.error("Couldn't enable notifications. Please try again.");
    } finally {
      setEnabling(false);
    }
  }

  async function replayGuide() {
    try {
      await updatePreferences({ hasSeenOnboarding: false });
      router.push("/onboarding");
    } catch (err) {
      console.error("Failed to reset onboarding", err);
      toast.error("Couldn't replay the guide. Please try again.");
    }
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
              {/* "denied" has no button — re-asking would instantly fail; the copy points the user
                  to their browser's site settings instead. */}
              {status !== "ready" && status !== "unsupported" && status !== "denied" && (
                <Button className="mt-3" onClick={enableNotifications} disabled={enabling}>
                  {enabling ? "Enabling…" : "Enable Notifications"}
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