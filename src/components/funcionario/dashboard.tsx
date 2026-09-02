"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";
import { formatPrice, toNumber } from "@/lib/formatters";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { orderStatusLabel, tableStatusLabel } from "@/lib/statuses";
import type { Order, TableStatus } from "@/types/order";
import { WaitingVisits } from "@/components/funcionario/waiting-visits";
import { Insights } from "@/components/funcionario/insights";
import { AdminNotifications } from "@/components/funcionario/admin-notifications";

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<{number:number;status:TableStatus}[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closingTable, setClosingTable] = useState(false);
  const [closeError, setCloseError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const [response,tablesResponse] = await Promise.all([fetch("/api/orders", { cache: "no-store" }),fetch("/api/tables",{cache:"no-store"})]);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os pedidos.");
      setOrders(body as Order[]);
      if(tablesResponse.ok)setTables(await tablesResponse.json());
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os pedidos."); }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);
  const { notifications, dismiss, realtimeReady } = useAdminNotifications(loadOrders);

  const now = new Date();
  const paidToday = orders.filter((order) => {
    const paidAt = new Date(order.paidAt ?? order.createdAt);
    return order.status === "PAGO" && paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth() && paidAt.getDate() === now.getDate();
  });
  const today = paidToday.reduce((sum, order) => sum + order.total, 0);
  const active = orders.filter((order) => !["PAGO", "CANCELADO"].includes(order.status));
  const pendingActions = orders.filter((order) => order.status === "RECEBIDO" || (order.status === "AGUARDANDO_PAGAMENTO" && order.payment?.status !== "CONFIRMED")).length;
  const occupiedTables = new Set(tables.filter((table)=>table.status!=="LIVRE").map((table)=>table.number));

  function tableStatus(table: number): TableStatus {
    const persisted=tables.find((item)=>item.number===table)?.status;
    if(persisted)return persisted;
    const tableOrders = active.filter((order) => order.table === table);
    if (tableOrders.some((order) => order.status === "AGUARDANDO_PAGAMENTO")) return "AGUARDANDO_PAGAMENTO";
    return tableOrders.length > 0 ? "OCUPADA" : "LIVRE";
  }

  async function forceCloseSelectedTable() {
    if (!selectedTable) return;
    setClosingTable(true);
    setCloseError("");
    try {
      const response = await fetch(`/api/admin/tables/${selectedTable}/force-close`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível encerrar o atendimento.");
      await loadOrders();
      setConfirmingClose(false);
      setSelectedTable(null);
    } catch (reason) {
      setCloseError(reason instanceof Error ? reason.message : "Não foi possível encerrar o atendimento.");
    } finally { setClosingTable(false); }
  }

  const selectedOrder = selectedTable
    ? [...active].reverse().find((order) => order.table === selectedTable)
    : undefined;

  return <Shell><AdminNotifications notifications={notifications} onDismiss={dismiss} /><header className="dash-header"><div><Logo /><p>Painel administrativo</p><small className="realtime-indicator" data-ready={realtimeReady}>{realtimeReady ? "Tempo real ativo" : "Conectando..."}</small></div><form action="/api/auth/logout" method="post"><button aria-label="Sair">↪</button></form></header><section className="dashboard"><h1>Visão geral</h1>{error && <p className="feedback-message error" role="alert">{error}</p>}<div className="stats admin-stats"><article><span>Faturamento hoje</span><b>{formatPrice(today)}</b><small>{paidToday.length} pedidos pagos</small></article><article><span>Mesas ocupadas</span><b>{occupiedTables.size}</b><small>{Math.max(0, 45 - occupiedTables.size)} livres</small></article><article><span>Em andamento</span><b>{orders.filter((order) => ["RECEBIDO", "EM_PREPARO", "PRONTO"].includes(order.status)).length}</b><small>cozinha</small></article></div><WaitingVisits /><div className="section-title"><h2>Mesas</h2><span className="muted">45 mesas</span></div><div className="table-grid">{Array.from({ length: 45 }, (_, index) => index + 1).map((table) => { const status = tableStatus(table); return <button key={table} className={`table-card status-${status.toLowerCase()}`} onClick={() => setSelectedTable(table)}><b>Mesa {String(table).padStart(2, "0")}</b><small>{tableStatusLabel(status)}</small></button>; })}</div><div className="section-title"><h2>Pedidos recentes</h2>{pendingActions > 0 && <span className="admin-action-badge">{pendingActions} {pendingActions === 1 ? "ação pendente" : "ações pendentes"}</span>}</div><div className="order-list">{orders.slice().slice(0, 5).map((order) => <a href={`/funcionario/pedido/${order.id}`} className="order" key={order.id}><span className="order-icon">▣</span><span><b>#{order.id}</b><small>{order.customerName ? order.customerName + " · " : ""}Mesa {String(order.table).padStart(2, "0")}</small></span><span className="order-price"><b>{formatPrice(order.total)}</b><em>{orderStatusLabel(order.status)}</em></span><span>›</span></a>)}{orders.length === 0 && !error && <p className="empty-menu">Nenhum pedido recebido ainda.</p>}</div><Insights /></section>{selectedTable && <div className="modal-backdrop product-backdrop" onMouseDown={() => setSelectedTable(null)}><section className="table-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedTable(null)}>×</button><p className="product-category">{tableStatusLabel(tableStatus(selectedTable))}</p><h2>Mesa {String(selectedTable).padStart(2, "0")}</h2>{selectedOrder ? <><p>Pedido #{selectedOrder.id}{selectedOrder.customerName ? " · " + selectedOrder.customerName : ""}</p>{selectedOrder.items.map((item) => <div className="table-item" key={item.name}><span>{item.quantity} × {item.name}</span><b>{formatPrice(toNumber(item.price) * item.quantity)}</b></div>)}<div className="total"><span>Total</span><b>{formatPrice(selectedOrder.total)}</b></div><a className="solid-button" href={`/funcionario/pedido/${selectedOrder.id}`}>Abrir pedido</a></> : <p className="muted">Esta mesa está livre e não possui pedido ativo.</p>}{tableStatus(selectedTable) !== "LIVRE" && <button className="danger-button" onClick={() => { setCloseError(""); setConfirmingClose(true); }}>Encerrar atendimento</button>}</section></div>}{confirmingClose && selectedTable && <div className="modal-backdrop product-backdrop" onMouseDown={() => !closingTable && setConfirmingClose(false)}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="force-close-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="force-close-title">Encerrar atendimento da Mesa {String(selectedTable).padStart(2, "0")}?</h2><p>Esta ação cancelará pedidos ativos, encerrará o atendimento e liberará a mesa. Deseja continuar?</p>{closeError && <p className="feedback-message error" role="alert">{closeError}</p>}<button className="danger-button" disabled={closingTable} onClick={() => void forceCloseSelectedTable()}>{closingTable ? "Encerrando..." : "Confirmar e liberar mesa"}</button><button className="text-button" disabled={closingTable} onClick={() => setConfirmingClose(false)}>Voltar</button></section></div>}<nav className="bottom-nav"><a className="active" href="/funcionario/painel">⌂<small>Início</small></a><a href="/funcionario/pedidos">▤<small>Pedidos</small></a><a href="/funcionario/cardapio">▦<small>Cardápio</small></a><a href="/funcionario/ajustes">⚙<small>Ajustes</small></a></nav></Shell>;
}
