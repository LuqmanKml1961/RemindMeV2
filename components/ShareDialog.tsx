"use client";

import { useState } from "react";
import { Copy, MessageCircle, Share } from "lucide-react";
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

interface ShareDialogProps {
  title: string;
  description: string;
  shareTitle: string;
  shareText: string;
  shareLink: string;
  onClose: () => void;
}

// One share surface for reminders and to-do lists. WhatsApp gets its own button because it's the
// way most people here pass things on; the native share sheet covers everything else on mobile.
export function ShareDialog({ title, description, shareTitle, shareText, shareLink, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copyLink() {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(onClose, 600);
    }
  }

  async function shareViaApps() {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: shareLink });
      onClose();
    } catch {
      // user cancelled the share sheet — keep the dialog open
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" render={<a href={whatsappHref} target="_blank" rel="noreferrer" onClick={onClose} />}>
            <MessageCircle /> Send on WhatsApp
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              <Copy /> {copied ? "Copied!" : "Copy"}
            </Button>
            {canNativeShare && (
              <Button variant="outline" className="flex-1" onClick={shareViaApps}>
                <Share /> Other apps
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
