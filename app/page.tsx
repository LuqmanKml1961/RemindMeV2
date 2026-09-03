"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2 } from "lucide-react";
import { db } from "../lib/db/dexie";
import { getPreferences } from "../lib/db/preferences";
import { ReminderCard } from "../components/ReminderCard";
import { Button } from "../components/ui/button";
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
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
            <p className="text-sm text-muted-foreground">Stay on top of what matters.</p>
          </div>
          <Button render={<Link href="/create" transitionTypes={["nav-forward"]} />}>
            <Plus /> New
          </Button>
        </div>

        {reminders && reminders.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            <p>No reminders yet.</p>
            <p>Tap “New” to create one.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((r) => (
            <ReminderCard key={r.id} reminder={r} />
          ))}
        </div>

        {completed.length > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Completed ({completed.length})
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
