"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";
import { formatPrice, toNumber } from "@/lib/formatters";
import { getOrders } from "@/lib/orders";
import { orderStatusLabel, tableStatusLabel } from "@/lib/statuses";
import type { Order, TableStatus } from "@/types/order";

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  useEffect(() => setOrders(getOrders()), []);

  const now = new Date();
  const paidToday = orders.filter((order) => {
    const paidAt = new Date(order.paidAt ?? order.createdAt);
    return order.status === "PAGO" && paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth() && paidAt.getDate() === now.getDate();
  });
  const today = paidToday.reduce((sum, order) => sum + order.total, 0);
  const active = orders.filter((order) => !["PAGO", "CANCELADO"].includes(order.status));
  const occupiedTables = new Set(active.map((order) => order.table));

  function tableStatus(table: number): TableStatus {
    const tableOrders = active.filter((order) => order.table === table);
    if (tableOrders.some((order) => order.status === "AGUARDANDO_PAGAMENTO")) return "AGUARDANDO_PAGAMENTO";
    return tableOrders.length > 0 ? "OCUPADA" : "LIVRE";
  }

  const selectedOrder = selectedTable
    ? [...active].reverse().find((order) => order.table === selectedTable)
    : undefined;

  return <Shell><header className="dash-header"><div><Logo /><p>Painel administrativo</p></div><a href="/">↪</a></header><section className="dashboard"><h1>Visão geral</h1><div className="stats admin-stats"><article><span>Faturamento hoje</span><b>{formatPrice(today)}</b><small>{paidToday.length} pedidos pagos</small></article><article><span>Mesas ocupadas</span><b>{occupiedTables.size}</b><small>{Math.max(0, 45 - occupiedTables.size)} livres</small></article><article><span>Em andamento</span><b>{orders.filter((order) => ["RECEBIDO", "EM_PREPARO", "PRONTO"].includes(order.status)).length}</b><small>cozinha</small></article></div><div className="section-title"><h2>Mesas</h2><span className="muted">45 mesas</span></div><div className="table-grid">{Array.from({ length: 45 }, (_, index) => index + 1).map((table) => { const status = tableStatus(table); return <button key={table} className={`table-card status-${status.toLowerCase()}`} onClick={() => setSelectedTable(table)}><b>Mesa {String(table).padStart(2, "0")}</b><small>{tableStatusLabel(status)}</small></button>; })}</div><div className="section-title"><h2>Pedidos recentes</h2></div><div className="order-list">{orders.slice().reverse().slice(0, 5).map((order) => <a href={`/funcionario/pedido/${order.id}`} className="order" key={order.id}><span className="order-icon">▣</span><span><b>#{order.id}</b><small>Mesa {String(order.table).padStart(2, "0")}</small></span><span className="order-price"><b>{formatPrice(order.total)}</b><em>{orderStatusLabel(order.status)}</em></span><span>›</span></a>)}{orders.length === 0 && <p className="empty-menu">Nenhum pedido recebido ainda.</p>}</div></section>{selectedTable && <div className="modal-backdrop product-backdrop" onMouseDown={() => setSelectedTable(null)}><section className="table-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedTable(null)}>×</button><p className="product-category">{tableStatusLabel(tableStatus(selectedTable))}</p><h2>Mesa {String(selectedTable).padStart(2, "0")}</h2>{selectedOrder ? <><p>Pedido #{selectedOrder.id}</p>{selectedOrder.items.map((item) => <div className="table-item" key={item.name}><span>{item.quantity} × {item.name}</span><b>{formatPrice(toNumber(item.price) * item.quantity)}</b></div>)}<div className="total"><span>Total</span><b>{formatPrice(selectedOrder.total)}</b></div><a className="solid-button" href={`/funcionario/pedido/${selectedOrder.id}`}>Abrir pedido</a></> : <p className="muted">Esta mesa está livre e não possui pedido ativo.</p>}</section></div>}<nav className="bottom-nav"><a className="active" href="/funcionario/painel">⌂<small>Início</small></a><a>▤<small>Pedidos</small></a><a href="/funcionario/cardapio">▦<small>Cardápio</small></a><a>⚙<small>Ajustes</small></a></nav></Shell>;
}
