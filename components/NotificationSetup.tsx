"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Smartphone, TriangleAlert } from "lucide-react";
import { retryPendingSchedules } from "../lib/db/reminders";
import {
  getVerifiedNotificationReadiness,
  requestNotificationPermissionAndSubscribe,
  type NotificationReadiness,
} from "../lib/push/client";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Spinner } from "./ui/spinner";

export const NOTIFICATION_STATUS_COPY: Record<NotificationReadiness, { label: string; detail: string }> = {
  unsupported: { label: "Not available", detail: "This browser can't show push notifications." },
  "needs-install": {
    label: "Install first",
    detail: "On iPhone or iPad, add RemindMe to your Home Screen (Share → Add to Home Screen), open it from there, then enable notifications.",
  },
  "needs-permission": { label: "Off", detail: "Reminders only alert you while the app is open." },
  denied: {
    label: "Blocked",
    detail: "Notifications are blocked for this site. Allow them in your browser settings, then try again.",
  },
  "not-configured": {
    label: "Failed",
    detail: "Your device allowed notifications, but registering with the server failed. Check your connection and try again.",
  },
  ready: { label: "On", detail: "Reminders will alert you even when the app is closed." },
};

const STATUS_ICON: Record<NotificationReadiness, typeof Bell> = {
  unsupported: BellOff,
  "needs-install": Smartphone,
  "needs-permission": Bell,
  denied: BellOff,
  "not-configured": TriangleAlert,
  ready: BellRing,
};

export function canEnableNotifications(status: NotificationReadiness): boolean {
  return status === "needs-permission" || status === "not-configured";
}

// The one place a user turns notifications on during onboarding. Enabling talks to the browser,
// the push service and the server in sequence, so the button stays in a visible loading state the
// whole time and the outcome is always shown — never assumed.
export function NotificationSetup({ onContinue }: { onContinue: (status: NotificationReadiness) => void }) {
  const [status, setStatus] = useState<NotificationReadiness | null>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVerifiedNotificationReadiness().then((readiness) => {
      if (!cancelled) setStatus(readiness);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (enabling) return;
    setEnabling(true);
    try {
      const result = await requestNotificationPermissionAndSubscribe();
      setStatus(result);
      if (result === "ready") await retryPendingSchedules().catch(() => 0);
    } catch (err) {
      console.error("Failed to enable notifications", err);
      setStatus("not-configured");
    } finally {
      setEnabling(false);
    }
  }

  if (status === null) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner /> Checking notification status…
      </p>
    );
  }

  const copy = NOTIFICATION_STATUS_COPY[status];
  const Icon = STATUS_ICON[status];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Notifications: {copy.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.detail}</p>
          </div>
        </CardContent>
      </Card>

      {canEnableNotifications(status) && (
        <Button size="lg" className="w-full" onClick={enable} disabled={enabling}>
          {enabling ? (
            <>
              <Spinner /> Setting up… allow the permission prompt if it appears
            </>
          ) : (
            <>
              <Bell /> Enable notifications
            </>
          )}
        </Button>
      )}

      <Button
        size="lg"
        variant={status === "ready" ? "default" : "outline"}
        className="w-full"
        onClick={() => onContinue(status)}
        disabled={enabling}
      >
        {status === "ready" ? "Continue" : "Skip for now"}
      </Button>
      {status !== "ready" && (
        <p className="text-center text-xs text-muted-foreground">You can turn notifications on later in Settings.</p>
      )}
    </div>
  );
}
