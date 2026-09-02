import { db, newId } from "./dexie";
import type { VaultCategory, VaultReference } from "../domain/types";

export async function createVaultReference(category: VaultCategory, title: string, note: string): Promise<VaultReference> {
  const entry: VaultReference = { id: newId(), category, title, note, createdAt: Date.now() };
  await db.vaultReferences.put(entry);
  return entry;
}

export async function updateVaultReference(entry: VaultReference): Promise<void> {
  await db.vaultReferences.put(entry);
}

export async function deleteVaultReference(id: string): Promise<void> {
  await db.vaultReferences.delete(id);
}
