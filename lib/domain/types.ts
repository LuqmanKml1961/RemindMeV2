// Domain models — ported 1:1 from the Kotlin app's app/src/main/java/com/remindme/domain/model/*.kt

export type ReminderType = "GENERAL" | "MEDICAL" | "MONTHLY";

export type RecurrenceUnit = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "EVERY_N_DAYS";

export interface RecurrenceRule {
  unit: RecurrenceUnit;
  interval: number; // only meaningful for EVERY_N_DAYS
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  type: ReminderType;
  createdAt: string; // ISO
  dueDate: string | null; // ISO
  isCompleted: boolean;
  isArchived: boolean;
  autoDelete: boolean;
  medications: Medication[];
  amount: number | null;
  recurrence: RecurrenceRule | null;
  shareId: string | null;
  sharedBy: string | null;
}

export type VaultCategory = "PEOPLE" | "HOME_VEHICLE" | "PROPERTY";

export const VAULT_CATEGORY_LABELS: Record<VaultCategory, string> = {
  PEOPLE: "People & Profiles",
  HOME_VEHICLE: "Home & Vehicle",
  PROPERTY: "Property & Access",
};

export interface VaultReference {
  id: string;
  category: VaultCategory;
  title: string;
  note: string;
  createdAt: number; // epoch millis
}

export interface TodoItem {
  id: string;
  text: string;
  isCompleted: boolean;
  priority: number;
  reminderId: string | null;
  createdAt: string; // ISO
}

export interface Preferences {
  id: "singleton";
  autoDeleteDefault: boolean;
  hasSeenOnboarding: boolean;
  deviceId: string;
}
