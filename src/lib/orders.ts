import type { Order } from "@/types/order";
import { readStorageJson, writeStorageJson } from "@/lib/storage";

export const TABLE_STORAGE_KEY = "ditus-table-access";
export const LAST_ORDER_STORAGE_KEY = "ditus-last-order";

function isStoredOrder(order: unknown): order is Order {
  if (typeof order !== "object" || order === null) return false;
  const candidate = order as Record<string, unknown>;
  return Number.isFinite(candidate.id) && Number.isInteger(candidate.table)
    && Number(candidate.table) >= 1 && Number(candidate.table) <= 45
    && Array.isArray(candidate.items) && Number.isFinite(candidate.total)
    && typeof candidate.status === "string" && typeof candidate.createdAt === "string";
}

export function getLastOrder(): Order | null {
  return readStorageJson<Order | null>(LAST_ORDER_STORAGE_KEY, null, (value): value is Order | null => value === null || isStoredOrder(value));
}

export function saveLastOrder(order: Order) {
  writeStorageJson(LAST_ORDER_STORAGE_KEY, order);
}

export function clearLastOrder() {
  window.localStorage.removeItem(LAST_ORDER_STORAGE_KEY);
}
