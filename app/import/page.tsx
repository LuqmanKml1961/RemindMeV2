"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { BrutalButton, BrutalCard } from "../../components/Brutal";
import { importReminder } from "../../lib/db/reminders";
import { decodeShareFragment, type SharePayload } from "../../lib/domain/share";
import { recurrenceLabel } from "../../lib/domain/recurrence";

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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">Import</h1>
        <p className="text-sm text-muted-fg">This link is invalid or corrupted.</p>
        <BrutalButton onClick={() => router.push("/")}>Back to RemindMe</BrutalButton>
      </div>
    );
  }

  if (imported) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">Imported!</h1>
        <p className="text-sm text-muted-fg">&quot;{payload.title}&quot; has been added to your reminders.</p>
        <BrutalButton fill onClick={() => router.push("/")}>
          Go to RemindMe
        </BrutalButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-black uppercase tracking-tight">Import Reminder</h1>
      <BrutalCard>
        <p className="font-bold">{payload.title}</p>
        {payload.description && <p className="mt-1 text-sm text-muted-fg">{payload.description}</p>}
        {payload.type === "MEDICAL" &&
          payload.medications.map((med) => (
            <p key={med.id} className="mt-2 text-sm text-muted-fg">
              {med.name}
              {med.dosage ? ` — ${med.dosage}` : ""}
            </p>
          ))}
        {payload.type === "MONTHLY" && payload.amount != null && (
          <p className="mt-2 text-sm font-bold text-accent-blue">RM{payload.amount.toFixed(2)}</p>
        )}
        {payload.dueDate && <p className="mt-2 text-xs font-bold uppercase text-muted-fg">{format(new Date(payload.dueDate), "d MMM, h:mm a")}</p>}
        {payload.recurrence && <p className="mt-1 text-xs font-bold uppercase text-muted-fg">↻ {recurrenceLabel(payload.recurrence)}</p>}
      </BrutalCard>
      <p className="text-xs text-muted-fg">This reminder was shared with you. Importing adds it to your device only.</p>
      <BrutalButton fill onClick={handleImport}>
        Import
      </BrutalButton>
    </div>
  );
}
