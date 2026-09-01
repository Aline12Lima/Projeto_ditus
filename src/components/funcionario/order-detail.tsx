"use client";

import { useEffect, useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { formatPrice, toNumber } from "@/lib/formatters";
import { orderStatusLabel } from "@/lib/statuses";
import type { Order, OrderStatus } from "@/types/order";

export function OrderDetail({ id }: { id?: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Pedido não encontrado.");
        setOrder(body as Order);
      } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Pedido não encontrado."); }
      finally { setLoading(false); }
    }
    void load();
  }, [id]);

  async function advance(status: OrderStatus, print = false) {
    if (!order) return;
    setError("");
    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível alterar o status.");
      setOrder({ ...order, status: body.status, paidAt: body.paid_at ?? order.paidAt });
      if (print) setTimeout(() => window.print(), 50);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Não foi possível alterar o status."); }
  }

  if (!order) return <Shell><header className="simple-header"><Back href="/funcionario/painel" /><h1>Detalhes do pedido</h1></header><div className="order-sent"><span>!</span><h2>{loading ? "Carregando pedido..." : error || "Pedido não encontrado"}</h2></div></Shell>;

  const action = order.status === "RECEBIDO"
    ? <button className="solid-button" onClick={() => void advance("EM_PREPARO", true)}>Enviar para cozinha e imprimir</button>
    : order.status === "EM_PREPARO"
      ? <button className="solid-button" onClick={() => void advance("PRONTO")}>Marcar como pronto</button>
      : order.status === "PRONTO"
        ? <button className="solid-button" onClick={() => void advance("ENTREGUE")}>Pedido entregue</button>
        : order.status === "ENTREGUE"
          ? <button className="solid-button" onClick={() => void advance("AGUARDANDO_PAGAMENTO")}>Solicitar pagamento</button>
        : order.status === "AGUARDANDO_PAGAMENTO"
            ? <button className="solid-button" onClick={() => void advance("PAGO")}>Pedido pago e liberar mesa</button>
          : null;

  return <Shell><header className="simple-header"><Back href="/funcionario/painel" /><h1>Detalhes do pedido</h1></header><section className="detail receipt">{error && <p className="feedback-message error" role="alert">{error}</p>}<div className="receipt-heading"><b>Restaurante Ditus</b><small>Pedido para cozinha</small></div><div className="order-top"><div><p>Pedido <b>#{order.id}</b></p><small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small></div><strong>{orderStatusLabel(order.status)}</strong></div><div className="customer"><span>{order.table}</span><div><b>Mesa {String(order.table).padStart(2, "0")}</b>{order.customerName && <small>Cliente: {order.customerName}</small>}<small>Atendimento no salão</small></div></div><h2>Itens do pedido</h2>{order.items.map((item) => <div className="item-line" key={item.name}><span>{item.quantity}x</span><div><b>{item.name}</b></div><b>{formatPrice(toNumber(item.price) * item.quantity)}</b></div>)}{order.notes && <p className="order-notes"><b>Observações:</b> {order.notes}</p>}<div className="total"><span>Total</span><b>{formatPrice(order.total)}</b></div><div className="detail-actions order-controls">{action}<button className="outline-button" onClick={() => window.print()}>Reimprimir cupom</button></div></section></Shell>;
}
