"use client";

import { useState } from "react";
import type { Reminder } from "../lib/domain/types";
import { buildShareLink, buildShareText } from "../lib/domain/share";
import { copyToClipboard } from "../lib/clipboard";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Reminder</DialogTitle>
          <DialogDescription>
            Share &quot;{reminder.title}&quot; with others. They can import it into RemindMe via the link — no
            account needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={copyLink}>
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button className="flex-1" onClick={shareViaApps}>
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
