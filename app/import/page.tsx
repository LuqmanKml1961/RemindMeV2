"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { PageTransition } from "../../components/PageTransition";
import { importReminder } from "../../lib/db/reminders";
import { decodeShareFragment, type SharePayload } from "../../lib/domain/share";
import { recurrenceLabel } from "../../lib/domain/recurrence";
import { ArrowLeft, Download, CheckCircle2, Repeat } from "lucide-react";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function useSharePayload(): SharePayload | null | undefined {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => undefined
  );
  if (hash === undefined) return undefined;
  const fragment = hash.replace(/^#/, "");
  return fragment ? decodeShareFragment(fragment) : null;
}

export default function ImportPage() {
  const router = useRouter();
  const payload = useSharePayload();
  const [imported, setImported] = useState(false);

  async function handleImport() {
    if (!payload) return;
    await importReminder(payload);
    setImported(true);
  }

  if (payload === undefined) return null;

  if (payload === null) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-4 py-8">
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="text-sm text-muted-foreground">This link is invalid or corrupted.</p>
          <Button variant="outline" className="w-fit" onClick={() => router.push("/", { transitionTypes: ["nav-back"] })}>
            <ArrowLeft /> Back to RemindMe
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (imported) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Imported!</h1>
          <p className="text-sm text-muted-foreground">&quot;{payload.title}&quot; has been added to your reminders.</p>
          <Button className="mt-2" onClick={() => router.push("/", { transitionTypes: ["nav-forward"] })}>
            Go to RemindMe
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Import Reminder</h1>
        <Card>
          <CardContent>
            <div className="mb-1.5">
              <Badge variant="secondary">{payload.type.toLowerCase()}</Badge>
            </div>
            <p className="font-medium">{payload.title}</p>
            {payload.description && <p className="mt-1 text-sm text-muted-foreground">{payload.description}</p>}
            {payload.type === "MEDICAL" &&
              payload.medications.map((med) => (
                <p key={med.id} className="mt-2 text-sm text-muted-foreground">
                  {med.name}
                  {med.dosage ? ` — ${med.dosage}` : ""}
                </p>
              ))}
            {payload.type === "MONTHLY" && payload.amount != null && (
              <p className="mt-2 text-sm font-semibold text-blue-500">RM{payload.amount.toFixed(2)}</p>
            )}
            {payload.dueDate && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {format(new Date(payload.dueDate), "d MMM, h:mm a")}
              </p>
            )}
            {payload.recurrence && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Repeat className="size-3" />
                {recurrenceLabel(payload.recurrence)}
              </p>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          This reminder was shared with you. Importing adds it to your device only.
        </p>
        <Button className="w-full" onClick={handleImport}>
          <Download /> Import
        </Button>
      </div>
    </PageTransition>
  );
}
