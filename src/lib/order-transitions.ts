import type { OrderStatus } from "@/types/order";

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  RECEBIDO: ["EM_PREPARO", "CANCELADO"],
  EM_PREPARO: ["PRONTO", "CANCELADO"],
  PRONTO: ["ENTREGUE"],
  ENTREGUE: ["AGUARDANDO_PAGAMENTO"],
  AGUARDANDO_PAGAMENTO: ["PAGO"],
  PAGO: [],
  CANCELADO: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}
