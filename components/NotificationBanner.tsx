"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";
import { getVerifiedNotificationReadiness, type NotificationReadiness } from "../lib/push/client";
import { NOTIFICATION_STATUS_COPY } from "./NotificationSetup";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

const BANNER_TITLE: Partial<Record<NotificationReadiness, string>> = {
  "needs-install": "Install to get notifications",
  "needs-permission": "Notifications are off",
  denied: "Notifications are blocked",
  "not-configured": "Notifications failed to set up",
};

// Shown on Home whenever reminders can't alert a closed app, so the user is never left guessing
// why a reminder stayed silent. Resolved after mount to keep the prerendered HTML stable.
export function NotificationBanner() {
  const [status, setStatus] = useState<NotificationReadiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerifiedNotificationReadiness().then((readiness) => {
      if (!cancelled) setStatus(readiness);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === null || status === "ready" || status === "unsupported") return null;

  return (
    <Alert>
      <BellOff />
      <AlertTitle>{BANNER_TITLE[status] ?? `Notifications: ${NOTIFICATION_STATUS_COPY[status].label}`}</AlertTitle>
      <AlertDescription>{NOTIFICATION_STATUS_COPY[status].detail}</AlertDescription>
      <AlertAction>
        <Button size="xs" variant="outline" render={<Link href="/settings" transitionTypes={["nav-forward"]} />}>
          Settings
        </Button>
      </AlertAction>
    </Alert>
  );
}
