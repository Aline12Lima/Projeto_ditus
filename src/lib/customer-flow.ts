import { readStorageJson, writeStorageJson } from "@/lib/storage";

export const CUSTOMER_NAME_STORAGE_KEY = "ditus-customer-name";
export const CUSTOMER_TOKEN_STORAGE_KEY = "ditus-customer-token";
export const VISIT_TRACKING_STORAGE_KEY = "ditus-visit-tracking-token";
export const CART_STORAGE_KEY = "ditus-cart-items";
export const LAST_ORDER_STORAGE_KEY = "ditus-last-order";
export const TABLE_STORAGE_KEY = "ditus-table-access";
export const IDEMPOTENCY_STORAGE_KEY = "ditus-order-idempotency-key";
export const FLOW_MESSAGE_STORAGE_KEY = "ditus-customer-flow-message";

export type TableAccess = { number: number; viaQr: true; accessToken: string };

function isTableAccess(value: unknown): value is TableAccess {
  if (!value || typeof value !== "object") return false;
  const access = value as Record<string, unknown>;
  return Number.isInteger(access.number) && Number(access.number) >= 1 && Number(access.number) <= 45
    && access.viaQr === true && typeof access.accessToken === "string" && access.accessToken.length > 0;
}

export function getTableAccess() {
  return readStorageJson<TableAccess | null>(TABLE_STORAGE_KEY, null, (value): value is TableAccess | null => value === null || isTableAccess(value));
}

export function saveTableAccess(access: TableAccess) {
  writeStorageJson(TABLE_STORAGE_KEY, access);
}

export function getOrCreateIdempotencyKey() {
  const saved = window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
  if (saved) return saved;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, created);
  return created;
}

export function clearPendingOrderRequest() {
  window.sessionStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
}

export function resetCustomerFlow(options: { preserveTableAccess?: boolean; message?: string } = {}) {
  const tableAccess = options.preserveTableAccess ? getTableAccess() : null;
  [CUSTOMER_NAME_STORAGE_KEY, CUSTOMER_TOKEN_STORAGE_KEY, VISIT_TRACKING_STORAGE_KEY, CART_STORAGE_KEY, LAST_ORDER_STORAGE_KEY, TABLE_STORAGE_KEY]
    .forEach((key) => window.localStorage.removeItem(key));
  clearPendingOrderRequest();
  if (tableAccess) saveTableAccess(tableAccess);
  if (options.message) window.sessionStorage.setItem(FLOW_MESSAGE_STORAGE_KEY, options.message);
}

export function consumeCustomerFlowMessage() {
  const message = window.sessionStorage.getItem(FLOW_MESSAGE_STORAGE_KEY);
  window.sessionStorage.removeItem(FLOW_MESSAGE_STORAGE_KEY);
  return message;
}

export function customerFlowStartPath() {
  const access = getTableAccess();
  return access ? `/mesa/${access.number}?token=${encodeURIComponent(access.accessToken)}` : "/cliente";
}

export function shouldResetCustomerFlow(visitHttpStatus: number, currentOrderStatus?: string) {
  return visitHttpStatus === 404 && currentOrderStatus !== "PAGO";
}
