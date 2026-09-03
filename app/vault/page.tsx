"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../../lib/db/dexie";
import { createVaultReference, deleteVaultReference } from "../../lib/db/vault";
import { VAULT_CATEGORY_LABELS } from "../../lib/domain/types";
import type { VaultCategory } from "../../lib/domain/types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { PageTransition } from "../../components/PageTransition";
import { Search, Plus, Trash2, X, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.keys(VAULT_CATEGORY_LABELS) as VaultCategory[];

export default function VaultPage() {
  const [category, setCategory] = useState<VaultCategory>("PEOPLE");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const entries = useLiveQuery(
    () => db.vaultReferences.where("category").equals(category).sortBy("createdAt"),
    [category],
    []
  );

  const filtered = (entries ?? []).filter(
    (e) => !query.trim() || e.title.toLowerCase().includes(query.toLowerCase()) || e.note.toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createVaultReference(category, title.trim(), note.trim());
    setTitle("");
    setNote("");
    setAdding(false);
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground">Quiet reference data. No notifications, ever.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={category === cat ? "default" : "outline"}
              onClick={() => setCategory(cat)}
            >
              {VAULT_CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{entry.title}</p>
                  {entry.note && <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">{entry.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive"
                  onClick={() => deleteVaultReference(entry.id)}
                >
                  <Trash2 />
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </p>
          )}
        </div>

        {adding ? (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">New entry</Label>
              <Button variant="ghost" size="icon-sm" onClick={() => setAdding(false)}>
                <X />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vault-title">Title</Label>
              <Input id="vault-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vault-note">Note</Label>
              <Textarea id="vault-note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Save /> Save
              </Button>
            </div>
          </form>
        ) : (
          <Button className={cn("w-full")} onClick={() => setAdding(true)}>
            <Plus /> Add to {VAULT_CATEGORY_LABELS[category]}
          </Button>
        )}
      </div>
    </PageTransition>
  );
}
