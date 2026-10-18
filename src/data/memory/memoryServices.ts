import type { Subscription, SubscriptionInput } from "../../domain/subscription";
import { todayISO } from "../../domain/dates";
import { decodePreferences, encodePreferencePatch } from "../preferencesCodec";
import { buildSeedSubscriptions } from "../seed";
import { DataError, type DataServices, type PreferencesRepository, type SubscriptionRepository } from "../types";

/**
 * Non-persistent implementation used for browser preview (`npm run dev`
 * without Tauri) and tests. Behaves like the SQLite repositories.
 */
export function createMemoryServices(): DataServices {
  const now = () => new Date().toISOString();
  const store = new Map<string, Subscription>();
  for (const input of buildSeedSubscriptions(todayISO())) {
    const sub: Subscription = { ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
    store.set(sub.id, sub);
  }

  const subscriptions: SubscriptionRepository = {
    async list() {
      return [...store.values()].sort((a, b) => a.merchant.localeCompare(b.merchant));
    },
    async create(input: SubscriptionInput) {
      const sub: Subscription = { ...input, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
      store.set(sub.id, sub);
      return sub;
    },
    async update(id, input) {
      const existing = store.get(id);
      if (!existing) throw new DataError(`Subscription ${id} not found`);
      const updated: Subscription = { ...existing, ...input, updatedAt: now() };
      store.set(id, updated);
      return updated;
    },
    async remove(id) {
      store.delete(id);
    },
  };

  const rows = new Map<string, string>();
  const preferences: PreferencesRepository = {
    async load() {
      return decodePreferences([...rows].map(([key, value]) => ({ key, value })));
    },
    async save(patch) {
      for (const { key, value } of encodePreferencePatch(patch)) rows.set(key, value);
      return decodePreferences([...rows].map(([key, value]) => ({ key, value })));
    },
  };

  return { subscriptions, preferences };
}
