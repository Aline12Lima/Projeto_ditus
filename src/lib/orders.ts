import type { Order, OrderStatus } from "@/types/order";
import { readStorageJson, writeStorageJson } from "@/lib/storage";

export const ORDERS_STORAGE_KEY = "ditus-orders";
export const TABLE_STORAGE_KEY = "ditus-table";
export const LAST_ORDER_STORAGE_KEY = "ditus-last-order";

function isStoredOrder(order: unknown): order is StoredOrder {
  if (typeof order !== "object" || order === null) return false;
  const candidate = order as Record<string, unknown>;
  return Number.isFinite(candidate.id) && Number.isInteger(candidate.table)
    && Number(candidate.table) >= 1 && Number(candidate.table) <= 45
    && Array.isArray(candidate.items) && Number.isFinite(candidate.total)
    && typeof candidate.status === "string" && typeof candidate.createdAt === "string";
}

function isStoredOrders(value: unknown): value is StoredOrder[] {
  return Array.isArray(value) && value.every(isStoredOrder);
}

type StoredOrder = Omit<Order, "status"> & { status: OrderStatus | "PEDIDO_RECEBIDO" };

export function getOrders(): Order[] {
  const orders = readStorageJson<StoredOrder[]>(ORDERS_STORAGE_KEY, [], isStoredOrders);
  return orders.map((order) => ({
    ...order,
    status: order.status === "PEDIDO_RECEBIDO" ? "RECEBIDO" : order.status,
  }));
}

export function saveOrders(orders: Order[]) {
  writeStorageJson(ORDERS_STORAGE_KEY, orders);
}

export function getLastOrder(): Order | null {
  const order = readStorageJson<StoredOrder | null>(LAST_ORDER_STORAGE_KEY, null, (value): value is StoredOrder | null => value === null || isStoredOrder(value));
  if (!order) return null;
  return { ...order, status: order.status === "PEDIDO_RECEBIDO" ? "RECEBIDO" : order.status };
}

export function saveLastOrder(order: Order) {
  writeStorageJson(LAST_ORDER_STORAGE_KEY, order);
}

export function clearLastOrder() {
  window.localStorage.removeItem(LAST_ORDER_STORAGE_KEY);
}
