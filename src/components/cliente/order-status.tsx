"use client";

import { useCallback, useEffect, useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { useOrderRealtime } from "@/hooks/use-realtime";
import { formatPrice } from "@/lib/formatters";
import { orderStatusLabel } from "@/lib/statuses";
import type { Order } from "@/types/order";

export function ClientOrderStatus({ id, token }: { id: string; token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${id}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Pedido não encontrado.");
      setOrder(body as Order);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Pedido não encontrado."); }
  }, [id, token]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);
  useOrderRealtime(token, loadOrder);

  return <Shell><header className="simple-header"><Back href="/cliente/cardapio" /><h1>Acompanhar pedido</h1></header><section className="detail">{error && <p className="feedback-message error" role="alert">{error}</p>}{!order && !error && <p className="empty-menu">Carregando pedido...</p>}{order && <><div className="order-top"><div><p>Pedido <b>#{order.id}</b></p><small>Mesa {String(order.table).padStart(2, "0")}</small></div><strong>{orderStatusLabel(order.status)}</strong></div><h2>Itens do pedido</h2>{order.items.map((item) => <div className="item-line" key={item.productId ?? item.name}><span>{item.quantity}x</span><div><b>{item.name}</b></div></div>)}<div className="total"><span>Total</span><b>{formatPrice(order.total)}</b></div><p className="muted">Esta tela atualiza automaticamente quando o restaurante alterar o status.</p></>}</section></Shell>;
}
