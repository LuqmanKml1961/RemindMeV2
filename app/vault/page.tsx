"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../../lib/db/dexie";
import { createVaultReference, deleteVaultReference } from "../../lib/db/vault";
import { VAULT_CATEGORY_LABELS } from "../../lib/domain/types";
import type { VaultCategory } from "../../lib/domain/types";
import { BrutalButton, BrutalCard, BrutalChip, BrutalInput, BrutalLabel, BrutalTextarea } from "../../components/Brutal";

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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Vault</h1>
        <p className="text-xs text-muted-fg">Quiet reference data. No notifications, ever.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <BrutalChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
            {VAULT_CATEGORY_LABELS[cat]}
          </BrutalChip>
        ))}
      </div>

      <BrutalInput placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />

      <div className="flex flex-col gap-2">
        {filtered.map((entry) => (
          <BrutalCard key={entry.id} className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{entry.title}</p>
              {entry.note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-fg">{entry.note}</p>}
            </div>
            <button onClick={() => deleteVaultReference(entry.id)} className="shrink-0 text-xs font-bold uppercase text-accent-red">
              Delete
            </button>
          </BrutalCard>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-fg">Nothing here yet.</p>}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 border-2 border-border p-4">
          <div>
            <BrutalLabel>Title</BrutalLabel>
            <BrutalInput value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <BrutalLabel>Note</BrutalLabel>
            <BrutalTextarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
          </div>
          <div className="flex gap-2">
            <BrutalButton type="button" className="flex-1" onClick={() => setAdding(false)}>
              Cancel
            </BrutalButton>
            <BrutalButton type="submit" fill className="flex-1">
              Save
            </BrutalButton>
          </div>
        </form>
      ) : (
        <BrutalButton fill onClick={() => setAdding(true)}>
          + Add to {VAULT_CATEGORY_LABELS[category]}
        </BrutalButton>
      )}
    </div>
  );
}
