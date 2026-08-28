"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Back } from "@/components/shared/back";
import { Shell } from "@/components/shared/shell";
import { useCart } from "@/hooks/use-cart";
import { useMenuItems } from "@/hooks/use-menu-items";
import { formatPrice, toNumber } from "@/lib/formatters";
import { clearLastOrder, getLastOrder, saveLastOrder } from "@/lib/orders";
import type { Order } from "@/types/order";
import { useCustomerVisitRealtime } from "@/hooks/use-realtime";
import type { CustomerVisit } from "@/types/customer-visit";

export function Cart() {
  const { items } = useMenuItems();
  const { cart, change, clear, totalItems } = useCart();
  const [sentOrder, setSentOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerToken, setCustomerToken] = useState("");
  const [visitTrackingToken, setVisitTrackingToken] = useState("");
  const [visit, setVisit] = useState<CustomerVisit | null>(null);
  const [visitPollingStopped, setVisitPollingStopped] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const lines = cart.flatMap((cartItem) => {
    const dish = items.find((item) => item.id === cartItem.dishId);
    return dish ? [{ dish, quantity: cartItem.quantity }] : [];
  });
  const total = lines.reduce((sum, line) => sum + toNumber(line.dish.price) * line.quantity, 0);

  useEffect(() => {
    setCustomerName(localStorage.getItem("ditus-customer-name") ?? "");
    setCustomerToken(localStorage.getItem("ditus-customer-token") ?? "");
    setVisitTrackingToken(localStorage.getItem("ditus-visit-tracking-token") ?? "");
    setSentOrder(getLastOrder());
  }, []);
  const loadVisit=useCallback(async()=>{if(!customerToken)return;const response=await fetch(`/api/customer-visits?token=${encodeURIComponent(customerToken)}`,{cache:"no-store"});if(response.status===404){setVisit(null);setVisitPollingStopped(true);return}if(response.ok){const nextVisit=await response.json() as CustomerVisit;setVisit(nextVisit);if(nextVisit.status!=="AGUARDANDO_MESA")setVisitPollingStopped(true)}},[customerToken]);
  useEffect(()=>{void loadVisit()},[loadVisit]);
  useEffect(()=>{if(visitPollingStopped||visit?.status!=="AGUARDANDO_MESA")return;const timer=setInterval(()=>void loadVisit(),10000);return()=>clearInterval(timer)},[loadVisit,visit?.status,visitPollingStopped]);
  useCustomerVisitRealtime(visitTrackingToken,loadVisit);

  async function sendOrder() {
    if (submittingRef.current || lines.length === 0 || !customerName || !customerToken || visit?.status!=="MESA_ASSOCIADA") return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      idempotencyKeyRef.current ??= crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerToken, notes, idempotencyKey: idempotencyKeyRef.current, items: lines.map(({ dish, quantity }) => ({ productId: dish.id, quantity })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar o pedido.");
      const nextOrder: Order = {
        id: result.order_id, table: result.table_number, customerName,
        items: lines.map(({ dish, quantity }) => ({ productId: dish.id, name: dish.name, price: dish.price, quantity })),
        total: Number(result.order_total), status: "RECEBIDO", createdAt: new Date().toISOString(), notes,
        sessionId: result.session_id, trackingToken: result.tracking_token,
      };
      saveLastOrder(nextOrder);
      clear();
      setSentOrder(nextOrder);
      setIsConfirming(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar o pedido.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function continueShopping() {
    clearLastOrder();
    setSentOrder(null);
  }

  return <Shell><header className="menu-header"><Back href="/cliente/cardapio" /><div><h1>Carrinho</h1><p>{totalItems} {totalItems === 1 ? "item" : "itens"}</p></div></header><section className="cart">{sentOrder ? <div className="order-sent" role="status"><span>✓</span><h2>Pedido enviado!</h2><p>Pedido <b>#{sentOrder.id}</b> recebido para a mesa {String(sentOrder.table).padStart(2, "0")}.</p>{sentOrder.trackingToken && <a className="solid-button" href={`/cliente/pedido/${sentOrder.id}?token=${sentOrder.trackingToken}`}>Acompanhar pedido</a>}<a className="text-button" href="/cliente/cardapio" onClick={continueShopping}>Continuar escolhendo</a></div> : lines.length === 0 ? <div className="order-sent"><span>🛒</span><h2>Seu carrinho está vazio</h2><p>Escolha seus itens no cardápio para iniciar um pedido.</p><a className="solid-button" href="/cliente/cardapio">Ver cardápio</a></div> : <>{errorMessage && <p className="feedback-message error" role="alert">{errorMessage}</p>}{visit?.status === "MESA_ASSOCIADA" ? <p className="visit-status success">Mesa {String(visit.tableNumber).padStart(2, "0")}</p> : <p className="visit-status">Aguardando o atendimento associar uma mesa. Você pode continuar montando o carrinho.</p>}<h2>Seu pedido</h2>{lines.map(({ dish, quantity }) => <article className="cart-item" key={dish.id}><span className="dish-photo mini">{dish.emoji}</span><div><h3>{dish.name}</h3><b>{dish.price}</b></div><div className="quantity"><button aria-label={`Remover uma unidade de ${dish.name}`} onClick={() => change(dish.id, quantity - 1)}>−</button><span>{quantity}</span><button aria-label={`Adicionar uma unidade de ${dish.name}`} onClick={() => change(dish.id, quantity + 1)}>+</button></div></article>)}<h2>Observações</h2><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Alguma observação para o pedido?" /><div className="cart-total"><span>Total</span><b>{formatPrice(total)}</b></div></>}</section>{!sentOrder && lines.length > 0 && <button className="checkout" disabled={isSubmitting || visit?.status !== "MESA_ASSOCIADA"} onClick={() => { setErrorMessage(""); setIsConfirming(true); }}>{visit?.status === "MESA_ASSOCIADA" ? "Revisar e enviar" : "Aguardando mesa"} <b>{formatPrice(total)}</b></button>}{isConfirming && <div className="modal-backdrop product-backdrop" role="presentation" onMouseDown={() => !isSubmitting && setIsConfirming(false)}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-order-title" onMouseDown={(event) => event.stopPropagation()}><h2 id="confirm-order-title">Confirmar pedido?</h2><p><b>{customerName}</b>, seu pedido é de {totalItems} {totalItems === 1 ? "item" : "itens"}.</p><div className="confirm-total"><span>Total</span><b>{formatPrice(total)}</b></div>{errorMessage && <p className="feedback-message error" role="alert">{errorMessage}</p>}<button className="solid-button" disabled={isSubmitting} onClick={() => void sendOrder()}>{isSubmitting ? "Enviando..." : "Confirmar envio"}</button><button className="text-button" disabled={isSubmitting} onClick={() => setIsConfirming(false)}>Voltar ao carrinho</button></section></div>}</Shell>;
}
