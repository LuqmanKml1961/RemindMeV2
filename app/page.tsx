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
import { cn } from "../lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        if (!prefs.hasSeenOnboarding) router.replace("/onboarding");
        else setCheckedOnboarding(true);
      })
      .catch(() => setCheckedOnboarding(true));
  }, [router]);

  // A notification click navigates to /?reminder={id} (see sw.js). Scroll to that reminder and
  // flash a highlight, then drop the query param so the next visit doesn't re-highlight it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("reminder");
    if (!id) return;
    window.history.replaceState(null, "", window.location.pathname);
    // Defer the state write out of the effect body (avoids a cascading-render setState) — the
    // highlight/scroll effect below reacts to it once set.
    const t = setTimeout(() => setHighlightId(id), 0);
    return () => clearTimeout(t);
  }, []);

  const reminders = useLiveQuery(() => db.reminders.filter((r) => !r.isArchived).sortBy("dueDate"), [], []);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`reminder-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId, reminders]);

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

        <div className="grid gap-3 sm:grid-cols-2 sm:auto-rows-fr">
          {active.map((r) => (
            <div
              key={r.id}
              id={`reminder-${r.id}`}
              className={cn("scroll-mt-24 rounded-xl", highlightId === r.id && "ring-2 ring-primary motion-fade")}
            >
              <ReminderCard reminder={r} />
            </div>
          ))}
        </div>

        {completed.length > 0 && (
          <details className="group mt-2">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Completed ({completed.length})
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:auto-rows-fr">
              {completed.map((r) => (
                <div
                  key={r.id}
                  id={`reminder-${r.id}`}
                  className={cn("scroll-mt-24 rounded-xl", highlightId === r.id && "ring-2 ring-primary motion-fade")}
                >
                  <ReminderCard reminder={r} />
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </PageTransition>
  );
}
