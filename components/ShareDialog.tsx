"use client";

import { useState } from "react";
import type { Reminder } from "../lib/domain/types";
import { buildShareLink, buildShareText } from "../lib/domain/share";
import { copyToClipboard } from "../lib/clipboard";
import { BrutalButton, BrutalCard } from "./Brutal";

export function ShareDialog({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(reminder);
  const shareLink = buildShareLink(reminder);

  async function copyLink() {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(onClose, 600);
    }
  }

  async function shareViaApps() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `RemindMe: ${reminder.title}`, text: shareText, url: shareLink });
        onClose();
        return;
      } catch {
        // user cancelled — fall through
      }
    } else {
      await copyLink();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <BrutalCard className="w-full max-w-sm bg-card" >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold uppercase">Share Reminder</h2>
          <p className="mt-2 text-sm text-muted-fg">
            Share &quot;{reminder.title}&quot; with others. They can import it into RemindMe via the link — no account needed.
          </p>
          <div className="mt-4 flex gap-2">
            <BrutalButton className="flex-1" onClick={copyLink}>
              {copied ? "Copied!" : "Copy Link"}
            </BrutalButton>
            <BrutalButton className="flex-1" fill onClick={shareViaApps}>
              Share
            </BrutalButton>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
}
