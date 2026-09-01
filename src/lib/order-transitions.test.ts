import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "@/lib/order-transitions";

describe("order transitions", () => {
  it("accepts the complete operational flow", () => {
    expect(canTransitionOrder("RECEBIDO", "EM_PREPARO")).toBe(true);
    expect(canTransitionOrder("EM_PREPARO", "PRONTO")).toBe(true);
    expect(canTransitionOrder("PRONTO", "ENTREGUE")).toBe(true);
    expect(canTransitionOrder("ENTREGUE", "AGUARDANDO_PAGAMENTO")).toBe(true);
    expect(canTransitionOrder("AGUARDANDO_PAGAMENTO", "PAGO")).toBe(true);
  });

  it("rejects skipped and terminal transitions", () => {
    expect(canTransitionOrder("RECEBIDO", "PAGO")).toBe(false);
    expect(canTransitionOrder("PAGO", "RECEBIDO")).toBe(false);
    expect(canTransitionOrder("CANCELADO", "EM_PREPARO")).toBe(false);
  });
});
