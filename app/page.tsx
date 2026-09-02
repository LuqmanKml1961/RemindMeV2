"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../lib/db/dexie";
import { getPreferences } from "../lib/db/preferences";
import { ReminderCard } from "../components/ReminderCard";
import { BrutalButton } from "../components/Brutal";
import { PageTransition } from "../components/PageTransition";

export default function HomePage() {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    getPreferences().then((prefs) => {
      if (!prefs.hasSeenOnboarding) router.replace("/onboarding");
      else setCheckedOnboarding(true);
    });
  }, [router]);

  const reminders = useLiveQuery(() => db.reminders.filter((r) => !r.isArchived).sortBy("dueDate"), [], []);

  if (!checkedOnboarding) return null;

  const active = reminders?.filter((r) => !r.isCompleted) ?? [];
  const completed = reminders?.filter((r) => r.isCompleted) ?? [];

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black uppercase tracking-tight">RemindMe</h1>
          <Link href="/create" transitionTypes={["nav-forward"]}>
            <BrutalButton fill className="px-4 py-2 text-sm">
              + New
            </BrutalButton>
          </Link>
        </div>

        {reminders && reminders.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-fg">No reminders yet. Tap “+ New” to create one.</p>
        )}

        <div className="flex flex-col gap-3">
          {active.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </div>

        {completed.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-bold uppercase text-muted-fg">Completed ({completed.length})</summary>
            <div className="mt-3 flex flex-col gap-3">
              {completed.map((r) => (
                <ReminderCard key={r.id} reminder={r} />
              ))}
            </div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
