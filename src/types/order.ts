export type OrderStatus =
  | "RECEBIDO"
  | "EM_PREPARO"
  | "PRONTO"
  | "ENTREGUE"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "CANCELADO";

export type TableStatus = "LIVRE" | "OCUPADA" | "AGUARDANDO_PAGAMENTO";

export type RestaurantTable = {
  id: number;
  number: number;
  status: TableStatus;
};

export type TableSession = {
  id: string;
  tableId: number;
  openedAt: string;
  closedAt?: string;
  orderIds: number[];
};

export type OrderItem = {
  productId?: string;
  name: string;
  price: string;
  quantity: number;
};

export type Order = {
  id: number;
  table: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  notes?: string;
  sessionId?: string;
  trackingToken?: string;
};
