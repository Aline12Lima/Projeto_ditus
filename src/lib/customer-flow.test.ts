import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_STORAGE_KEY, CUSTOMER_NAME_STORAGE_KEY, CUSTOMER_TOKEN_STORAGE_KEY, IDEMPOTENCY_STORAGE_KEY,
  LAST_ORDER_STORAGE_KEY, TABLE_STORAGE_KEY, VISIT_TRACKING_STORAGE_KEY, clearPendingOrderRequest,
  getOrCreateIdempotencyKey, getTableAccess, resetCustomerFlow, saveTableAccess,
  shouldResetCustomerFlow,
} from "@/lib/customer-flow";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe("customer flow lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() });
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("first-key").mockReturnValueOnce("second-key") });
  });

  it("remove todo o atendimento e preserva somente o acesso físico QR", () => {
    saveTableAccess({ number: 4, viaQr: true, accessToken: "physical-table-token" });
    [CUSTOMER_NAME_STORAGE_KEY, CUSTOMER_TOKEN_STORAGE_KEY, VISIT_TRACKING_STORAGE_KEY, CART_STORAGE_KEY, LAST_ORDER_STORAGE_KEY]
      .forEach((key) => window.localStorage.setItem(key, "old-flow"));
    window.sessionStorage.setItem(IDEMPOTENCY_STORAGE_KEY, "old-request-key");

    resetCustomerFlow({ preserveTableAccess: true });

    expect([CUSTOMER_NAME_STORAGE_KEY, CUSTOMER_TOKEN_STORAGE_KEY, VISIT_TRACKING_STORAGE_KEY, CART_STORAGE_KEY, LAST_ORDER_STORAGE_KEY]
      .map((key) => window.localStorage.getItem(key))).toEqual([null, null, null, null, null]);
    expect(window.sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY)).toBeNull();
    expect(getTableAccess()).toEqual({ number: 4, viaQr: true, accessToken: "physical-table-token" });
  });

  it("gera uma nova chave depois de concluir ou invalidar a requisição anterior", () => {
    const first = getOrCreateIdempotencyKey();
    expect(getOrCreateIdempotencyKey()).toBe(first);
    clearPendingOrderRequest();
    const second = getOrCreateIdempotencyKey();
    expect(second).not.toBe(first);
  });

  it("remove também o contexto de mesa quando o atendimento não veio de QR", () => {
    window.localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify({ number: 4, viaQr: true, accessToken: "physical-table-token" }));
    resetCustomerFlow();
    expect(window.localStorage.getItem(TABLE_STORAGE_KEY)).toBeNull();
  });

  it("não faz reset completo quando só o pedido foi cancelado e a visita continua ativa", () => {
    expect(shouldResetCustomerFlow(200, "CANCELADO")).toBe(false);
    expect(shouldResetCustomerFlow(404, "CANCELADO")).toBe(true);
    expect(shouldResetCustomerFlow(404, "PAGO")).toBe(false);
  });
});
