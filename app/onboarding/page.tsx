"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePreferences } from "../../lib/db/preferences";
import { REMINDER_KINDS, type ReminderKind } from "../../lib/domain/kind";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { NotificationSetup } from "../../components/NotificationSetup";
import { PageTransition } from "../../components/PageTransition";
import { cn } from "../../lib/utils";
import { ArrowLeft, ArrowRight, Bell, BellRing, ListChecks, MessageCircle, Pill, Plus, Repeat, Share2, Vault, Wallet } from "lucide-react";

const STEPS = ["what", "create", "share", "notifications"] as const;
type Step = (typeof STEPS)[number];

const KIND_ICON: Record<ReminderKind, typeof Bell> = {
  ONCE: Bell,
  REPEAT: Repeat,
  MEDICAL: Pill,
  MONEY: Wallet,
};

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`Step ${current + 1} of ${STEPS.length}`}>
      {STEPS.map((step, index) => (
        <span
          key={step}
          className={cn("h-1.5 rounded-full transition-all", index === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

function FeatureRow({ icon: Icon, title, body }: { icon: typeof Bell; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const step: Step = STEPS[index];

  async function finish() {
    try {
      await updatePreferences({ hasSeenOnboarding: true });
    } catch (err) {
      console.error("Failed to save onboarding state", err);
      toast.error("Couldn't save your progress. Please try again.");
      return;
    }
    router.replace("/", { transitionTypes: ["nav-forward"] });
  }

  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));
  const skipToNotifications = () => setIndex(STEPS.length - 1);

  return (
    <PageTransition>
      <div className="flex min-h-[70vh] flex-col gap-6">
        <div className="flex items-center justify-between">
          <StepDots current={index} />
          {step !== "notifications" && (
            <Button variant="ghost" size="sm" onClick={skipToNotifications}>
              Skip
            </Button>
          )}
        </div>

        {step === "what" && (
          <div className="flex flex-col gap-6">
            <div className="space-y-2 py-2 text-center">
              <Image src="/icons/icon-192.png?v=2" alt="RemindMe" width={80} height={80} priority unoptimized className="mx-auto mb-3 size-20 rounded-2xl" />
              <h1 className="text-3xl font-semibold tracking-tight">RemindMe</h1>
              <p className="text-muted-foreground">Reminders that reach you — even when the app is closed.</p>
            </div>
            <Card>
              <CardContent className="flex flex-col gap-5">
                <FeatureRow icon={BellRing} title="Reminder" body="Alerts you at a time. Once, repeating, medical, or money." />
                <FeatureRow icon={ListChecks} title="To-do" body="A checklist. Alerts are optional — add one to any task." />
                <FeatureRow icon={Vault} title="Vault" body="Things you want to remember. No alerts; peek when you forget." />
              </CardContent>
            </Card>
            <p className="text-center text-xs text-muted-foreground">No accounts, no cloud. Everything stays on your device.</p>
          </div>
        )}

        {step === "create" && (
          <div className="flex flex-col gap-6">
            <div className="space-y-2 py-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Creating a reminder</h1>
              <p className="text-muted-foreground">
                Tap <span className="inline-flex items-center gap-0.5 font-medium text-foreground"><Plus className="size-3.5" /> New</span>, pick a kind, set a time, save.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_KINDS.map((kind) => {
                const Icon = KIND_ICON[kind.value];
                return (
                  <Card key={kind.value} size="sm">
                    <CardContent>
                      <p className="flex items-center gap-1.5 font-medium">
                        <Icon className="size-3.5 text-primary" /> {kind.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{kind.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground">Mark it done when it fires. &ldquo;Once&rdquo; reminders clean themselves up.</p>
          </div>
        )}

        {step === "share" && (
          <div className="flex flex-col gap-6">
            <div className="space-y-2 py-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Share it</h1>
              <p className="text-muted-foreground">Any reminder or your whole to-do list — one link.</p>
            </div>
            <Card>
              <CardContent className="flex flex-col gap-5">
                <FeatureRow icon={Share2} title="Tap Share" body="On a reminder card, or “Share list” on the To-do page." />
                <FeatureRow icon={MessageCircle} title="Send on WhatsApp" body="Or copy the link, or use any app on your phone." />
                <FeatureRow icon={ListChecks} title="They tap, it lands" body="It appears in their own RemindMe. No account, no sign-up." />
              </CardContent>
            </Card>
          </div>
        )}

        {step === "notifications" && (
          <div className="flex flex-col gap-6">
            <div className="space-y-2 py-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Get notified</h1>
              <p className="text-muted-foreground">
                Reminders can alert you even when the app is closed. Turn that on now, or skip and do it later in Settings.
              </p>
            </div>
            <NotificationSetup onContinue={finish} />
          </div>
        )}

        {step !== "notifications" && (
          <div className="mt-auto flex gap-3">
            {index > 0 && (
              <Button variant="outline" size="lg" className="flex-1" onClick={back}>
                <ArrowLeft /> Back
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={next}>
              Next <ArrowRight />
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
