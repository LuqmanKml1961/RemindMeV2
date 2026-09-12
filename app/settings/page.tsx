"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { getPreferences, updatePreferences } from "../../lib/db/preferences";
import { retryPendingSchedules } from "../../lib/db/reminders";
import {
  disableNotifications,
  getVerifiedNotificationReadiness,
  requestNotificationPermissionAndSubscribe,
  sendTestNotification,
  type NotificationReadiness,
} from "../../lib/push/client";
import { NOTIFICATION_STATUS_COPY, canEnableNotifications } from "../../components/NotificationSetup";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Spinner } from "../../components/ui/spinner";
import { PageTransition } from "../../components/PageTransition";
import { Bell, RotateCcw, BellOff, Send } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [autoDeleteDefault, setAutoDeleteDefault] = useState(false);
  // null = still checking. Resolved after mount so the prerendered HTML and the first client
  // render agree (browser APIs aren't available during prerendering).
  const [status, setStatus] = useState<NotificationReadiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getPreferences().then((p) => setAutoDeleteDefault(p.autoDeleteDefault));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVerifiedNotificationReadiness().then((readiness) => {
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
    try {
      const result = await requestNotificationPermissionAndSubscribe();
      setStatus(result);
      if (result === "ready") {
        toast.success("Notifications on");
        // Reminders created before push was enabled (or while offline) may have missed their
        // server-side schedule — push them through now.
        const synced = await retryPendingSchedules().catch(() => 0);
        if (synced > 0) toast.success(`${synced} reminder${synced === 1 ? "" : "s"} scheduled for push`);
      } else {
        toast.error(NOTIFICATION_STATUS_COPY[result].detail);
      }
    } catch (err) {
      console.error("Failed to enable notifications", err);
      setStatus("not-configured");
      toast.error("Couldn't enable notifications. Please try again.");
    }
  }

  async function turnOffNotifications() {
    try {
      await disableNotifications();
      setStatus("needs-permission");
      toast.success("Notifications off");
    } catch (err) {
      console.error("Failed to disable notifications", err);
      toast.error("Couldn't turn notifications off. Check your connection and try again.");
    }
  }

  async function toggleNotifications(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (on) await enableNotifications();
      else await turnOffNotifications();
    } finally {
      setBusy(false);
    }
  }

  async function testNotification() {
    if (testing) return;
    setTesting(true);
    try {
      const result = await sendTestNotification();
      switch (result) {
        case "sent":
          toast.success("Test sent — it should appear in your notification tray within a few seconds.");
          break;
        case "gone":
          setStatus("needs-permission");
          toast.error("This device's push subscription has expired. Turn notifications on again.");
          break;
        case "not-enabled":
          setStatus("needs-permission");
          toast.error("Notifications aren't enabled on this device.");
          break;
        case "failed":
          toast.error("The server couldn't send the push. Check the server's VAPID configuration.");
          break;
        default:
          toast.error("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setTesting(false);
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
              {busy ? (
                <Spinner />
              ) : status === "ready" ? (
                <Bell className="size-4" />
              ) : (
                <BellOff className="size-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">
                  Notifications{status ? `: ${NOTIFICATION_STATUS_COPY[status].label}` : ""}
                </p>
                {/* The switch is only interactive where toggling can succeed: "denied" needs the
                    browser's site settings, "needs-install" needs Add to Home Screen first. */}
                <Switch
                  checked={status === "ready"}
                  onCheckedChange={toggleNotifications}
                  disabled={busy || status === null || (status !== "ready" && !canEnableNotifications(status))}
                  aria-label="Toggle notifications"
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {busy ? "Working… allow the permission prompt if it appears." : status ? NOTIFICATION_STATUS_COPY[status].detail : "Checking…"}
              </p>
              {status === "ready" && (
                <Button variant="outline" size="sm" className="mt-3" onClick={testNotification} disabled={testing || busy}>
                  {testing ? <Spinner /> : <Send />}
                  {testing ? "Sending…" : "Send test notification"}
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