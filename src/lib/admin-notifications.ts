import type { PaymentMethod, PaymentStatus } from "@/types/order";

export type AdminRealtimeEvent = {
  table: "orders" | "restaurant_tables" | "customer_visits" | "payment_requests";
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export type AdminNotification = {
  key: string;
  message: string;
  orderId?: number;
  visitId?: string;
};

const paymentLabels: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CARTAO: "cartão",
  DINHEIRO: "dinheiro",
};

function number(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}
export function notificationFromAdminEvent(event: AdminRealtimeEvent): AdminNotification | null {
  const row = event.new;

  if (event.table === "customer_visits" && row.status === "AGUARDANDO_MESA") {
    const visitId = String(row.id ?? "");
    return visitId ? { key: `visit:${visitId}:waiting`, message: "Nova visita aguardando mesa", visitId } : null;
  }

  if (event.table === "orders") {
    const orderId = number(row.id);
    if (!Number.isInteger(orderId)) return null;
    const status = String(row.status ?? "");
    if (event.eventType === "INSERT" && status === "RECEBIDO") {
      return { key: `order:${orderId}:RECEBIDO`, message: "Novo pedido recebido", orderId };
    }
    if (event.eventType !== "UPDATE") return null;
    if (status === "RECEBIDO") {
      return { key: `order:${orderId}:revision:${String(row.updated_at ?? "")}`, message: "Pedido revisado", orderId };
    }
    const messages: Record<string, string> = {
      EM_PREPARO: "Pedido enviado para cozinha",
      PRONTO: "Pedido pronto",
      ENTREGUE: "Pedido entregue",
      PAGO: "Pagamento confirmado",
    };
    return messages[status] ? { key: `order:${orderId}:${status}`, message: messages[status], orderId } : null;
  }

  if (event.table === "payment_requests") {
    const orderId = number(row.order_id);
    const method = row.method as PaymentMethod;
    const status = row.status as PaymentStatus;
    if (!Number.isInteger(orderId) || !paymentLabels[method]) return null;
    if (status === "REQUESTED") {
      return { key: `payment:${orderId}:${method}:REQUESTED`, message: `Pagamento solicitado por ${paymentLabels[method]}`, orderId };
    }
    if (method === "PIX" && status === "CUSTOMER_REPORTED") {
      return { key: `payment:${orderId}:PIX:CUSTOMER_REPORTED`, message: "Cliente informou o pagamento Pix", orderId };
    }
  }

  return null;
}
