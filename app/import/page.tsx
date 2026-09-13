"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { PageTransition } from "../../components/PageTransition";
import { importReminder } from "../../lib/db/reminders";
import { importTodoList } from "../../lib/db/todos";
import { decodeSharedContent, type SharedContent } from "../../lib/domain/share";
import { recurrenceLabel } from "../../lib/domain/recurrence";
import { kindLabel, reminderKind } from "../../lib/domain/kind";
import { ArrowLeft, Download, CheckCircle2, Repeat, Square } from "lucide-react";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function useSharedContent(): SharedContent | null | undefined {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => undefined
  );
  if (hash === undefined) return undefined;
  const fragment = hash.replace(/^#/, "");
  return fragment ? decodeSharedContent(fragment) : null;
}

// What was imported, kept in state because the URL fragment is dropped right after a successful
// import (so a refresh can't import the same link twice) and the shared content is gone with it.
type ImportResult = { kind: "reminder"; title: string } | { kind: "todo"; count: number; listId: string };

export default function ImportPage() {
  const router = useRouter();
  const shared = useSharedContent();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!shared || importing) return;
    setImporting(true);
    let imported: ImportResult;
    try {
      if (shared.kind === "reminder") {
        await importReminder(shared.payload);
        imported = { kind: "reminder", title: shared.payload.title };
      } else {
        const list = await importTodoList(shared.payload.title, shared.payload.items);
        imported = { kind: "todo", count: shared.payload.items.length, listId: list.id };
      }
    } catch (err) {
      console.error("Failed to import", err);
      setImporting(false);
      toast.error("Couldn't import this. Please try again.");
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setResult(imported);
  }

  if (result) {
    const isTodo = result.kind === "todo";
    return (
      <PageTransition>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Imported!</h1>
          <p className="text-sm text-muted-foreground">
            {result.kind === "todo"
              ? `${result.count} task${result.count === 1 ? "" : "s"} added as a new list in your To-do.`
              : `"${result.title}" has been added to your reminders.`}
          </p>
          <Button
            className="mt-2"
            onClick={() => router.push(result.kind === "todo" ? `/todo/${result.listId}` : "/", { transitionTypes: ["nav-forward"] })}
          >
            {isTodo ? "Open the list" : "Go to RemindMe"}
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (shared === undefined) return null;

  if (shared === null) {
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

  const isTodo = shared.kind === "todo";

  return (
    <PageTransition>
      <div className="flex flex-col gap-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{isTodo ? "Import To-do List" : "Import Reminder"}</h1>
        <Card>
          <CardContent>
            {shared.kind === "todo" ? (
              <>
                {shared.payload.title && <p className="mb-2 font-medium">{shared.payload.title}</p>}
                <ul className="space-y-1.5 text-sm">
                  {shared.payload.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Square className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="mb-1.5">
                  <Badge variant="secondary">{kindLabel(reminderKind(shared.payload))}</Badge>
                </div>
                <p className="font-medium">{shared.payload.title}</p>
                {shared.payload.description && <p className="mt-1 text-sm text-muted-foreground">{shared.payload.description}</p>}
                {shared.payload.type === "MEDICAL" &&
                  shared.payload.medications.map((med) => (
                    <p key={med.id} className="mt-2 text-sm text-muted-foreground">
                      {med.name}
                      {med.dosage ? ` — ${med.dosage}` : ""}
                    </p>
                  ))}
                {shared.payload.type === "MONTHLY" && shared.payload.amount != null && (
                  <p className="mt-2 text-sm font-semibold text-blue-500">RM{shared.payload.amount.toFixed(2)}</p>
                )}
                {shared.payload.dueDate && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    {format(new Date(shared.payload.dueDate), "d MMM, h:mm a")}
                  </p>
                )}
                {shared.payload.recurrence && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Repeat className="size-3" />
                    {recurrenceLabel(shared.payload.recurrence)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          {isTodo
            ? "This list was shared with you. Importing adds it as a new list on your device only."
            : "This reminder was shared with you. Importing adds it to your device only."}
        </p>
        <Button className="w-full" onClick={handleImport} disabled={importing}>
          <Download /> {importing ? "Importing..." : "Import"}
        </Button>
      </div>
    </PageTransition>
  );
}
