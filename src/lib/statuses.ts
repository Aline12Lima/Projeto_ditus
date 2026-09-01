import type { OrderStatus, TableStatus } from "@/types/order";

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEBIDO: "Pedido recebido",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  LIVRE: "Livre",
  OCUPADA: "Ocupada",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
};

export function orderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_LABELS[status];
}

export function tableStatusLabel(status: TableStatus) {
  return TABLE_STATUS_LABELS[status];
}
