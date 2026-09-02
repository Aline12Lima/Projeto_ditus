import { describe, expect, it } from "vitest";
import { notificationFromAdminEvent, type AdminRealtimeEvent } from "@/lib/admin-notifications";

function event(table: AdminRealtimeEvent["table"], eventType: AdminRealtimeEvent["eventType"], row: Record<string, unknown>): AdminRealtimeEvent {
  return { table, eventType, new: row, old: {} };
}

describe("notificationFromAdminEvent", () => {
  it("classifica o ciclo relevante do pedido", () => {
    expect(notificationFromAdminEvent(event("orders", "INSERT", { id: 8, status: "RECEBIDO" }))?.message).toBe("Novo pedido recebido");
    expect(notificationFromAdminEvent(event("orders", "UPDATE", { id: 8, status: "RECEBIDO", updated_at: "now" }))?.message).toBe("Pedido revisado");
    expect(notificationFromAdminEvent(event("orders", "UPDATE", { id: 8, status: "EM_PREPARO" }))?.message).toBe("Pedido enviado para cozinha");
    expect(notificationFromAdminEvent(event("orders", "UPDATE", { id: 8, status: "PRONTO" }))?.message).toBe("Pedido pronto");
    expect(notificationFromAdminEvent(event("orders", "UPDATE", { id: 8, status: "ENTREGUE" }))?.message).toBe("Pedido entregue");
    expect(notificationFromAdminEvent(event("orders", "UPDATE", { id: 8, status: "PAGO" }))?.message).toBe("Pagamento confirmado");
  });

  it("classifica solicitações e confirmação informada de Pix", () => {
    expect(notificationFromAdminEvent(event("payment_requests", "INSERT", { order_id: 9, method: "PIX", status: "REQUESTED" }))?.message).toBe("Pagamento solicitado por PIX");
    expect(notificationFromAdminEvent(event("payment_requests", "INSERT", { order_id: 9, method: "CARTAO", status: "REQUESTED" }))?.message).toBe("Pagamento solicitado por cartão");
    expect(notificationFromAdminEvent(event("payment_requests", "INSERT", { order_id: 9, method: "DINHEIRO", status: "REQUESTED" }))?.message).toBe("Pagamento solicitado por dinheiro");
    expect(notificationFromAdminEvent(event("payment_requests", "UPDATE", { order_id: 9, method: "PIX", status: "CUSTOMER_REPORTED" }))?.message).toBe("Cliente informou o pagamento Pix");
  });

  it("ignora eventos sem ação administrativa", () => {
    expect(notificationFromAdminEvent(event("restaurant_tables", "UPDATE", { id: 1 }))).toBeNull();
    expect(notificationFromAdminEvent(event("payment_requests", "UPDATE", { order_id: 9, method: "PIX", status: "CONFIRMED" }))).toBeNull();
  });
});
