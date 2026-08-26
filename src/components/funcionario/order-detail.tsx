"use client";

import { useEffect, useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { formatPrice, toNumber } from "@/lib/formatters";
import { getOrders, saveOrders } from "@/lib/orders";
import { orderStatusLabel } from "@/lib/statuses";
import type { Order, OrderStatus } from "@/types/order";

export function OrderDetail({ id }: { id?: string }) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const found = getOrders().find((item) => String(item.id) === id) ?? getOrders().at(-1) ?? null;
    setOrder(found);
  }, [id]);

  function advance(status: OrderStatus, print = false) {
    if (!order) return;
    const updated: Order = { ...order, status, ...(status === "PAGO" ? { paidAt: new Date().toISOString() } : {}) };
    saveOrders(getOrders().map((item) => item.id === order.id ? updated : item));
    setOrder(updated);
    if (print) setTimeout(() => window.print(), 50);
  }

  if (!order) return <Shell><header className="simple-header"><Back href="/funcionario/painel" /><h1>Detalhes do pedido</h1></header><div className="order-sent"><span>!</span><h2>Pedido não encontrado</h2></div></Shell>;

  const action = order.status === "RECEBIDO"
    ? <button className="solid-button" onClick={() => advance("EM_PREPARO", true)}>Enviar para cozinha e imprimir</button>
    : order.status === "EM_PREPARO"
      ? <button className="solid-button" onClick={() => advance("PRONTO")}>Marcar como pronto</button>
      : order.status === "PRONTO"
        ? <button className="solid-button" onClick={() => advance("ENTREGUE")}>Pedido entregue</button>
        : order.status === "ENTREGUE"
        ? <button className="solid-button" onClick={() => advance("AGUARDANDO_PAGAMENTO")}>Solicitar pagamento</button>
        : order.status === "AGUARDANDO_PAGAMENTO"
          ? <button className="solid-button" onClick={() => advance("PAGO")}>Pedido pago e liberar mesa</button>
          : null;

  return <Shell><header className="simple-header"><Back href="/funcionario/painel" /><h1>Detalhes do pedido</h1></header><section className="detail receipt"><div className="receipt-heading"><b>Restaurante Ditos</b><small>Pedido para cozinha</small></div><div className="order-top"><div><p>Pedido <b>#{order.id}</b></p><small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small></div><strong>{orderStatusLabel(order.status)}</strong></div><div className="customer"><span>{order.table}</span><div><b>Mesa {String(order.table).padStart(2, "0")}</b><small>Atendimento no salão</small></div></div><h2>Itens do pedido</h2>{order.items.map((item) => <div className="item-line" key={item.name}><span>{item.quantity}x</span><div><b>{item.name}</b></div><b>{formatPrice(toNumber(item.price) * item.quantity)}</b></div>)}{order.notes && <p className="order-notes"><b>Observações:</b> {order.notes}</p>}<div className="total"><span>Total</span><b>{formatPrice(order.total)}</b></div><div className="detail-actions order-controls">{action}<button className="outline-button" onClick={() => window.print()}>Reimprimir cupom</button></div></section></Shell>;
}
