"use client";
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {Back} from "@/components/shared/back";
import {Shell} from "@/components/shared/shell";
import {useOrderRealtime} from "@/hooks/use-realtime";
import {formatPrice} from "@/lib/formatters";
import {clearCompletedCustomerFlow,clearLastOrder} from "@/lib/orders";
import {clearPendingOrderRequest} from "@/lib/customer-flow";
import {orderStatusLabel} from "@/lib/statuses";
import type {Order,PaymentMethod} from "@/types/order";

export function ClientOrderStatus({id,token}:{id:string;token:string}){
  const router=useRouter();
  const [order,setOrder]=useState<Order|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [pixQr,setPixQr]=useState<string|null>(null);
  const [pixPayload,setPixPayload]=useState<string|null>(null);
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState("");
  const [reviewed,setReviewed]=useState(false);
  const [cancelledWithinActiveVisit,setCancelledWithinActiveVisit]=useState(false);

  const loadOrder=useCallback(async()=>{try{const response=await fetch(`/api/orders/${id}?token=${encodeURIComponent(token)}`,{cache:"no-store"}),body=await response.json();if(!response.ok)throw new Error(body.error??"Pedido não encontrado.");setOrder(body);setReviewed(Boolean(body.reviewed));if(body.status==="CANCELADO"){const customerToken=localStorage.getItem("ditus-customer-token");if(customerToken){const visitResponse=await fetch(`/api/customer-visits?token=${encodeURIComponent(customerToken)}`,{cache:"no-store"});if(visitResponse.ok){clearLastOrder();clearPendingOrderRequest();setCancelledWithinActiveVisit(true)}}}}catch(reason){setError(reason instanceof Error?reason.message:"Pedido não encontrado.")}},[id,token]);
  useEffect(()=>{void loadOrder()},[loadOrder]);
  useOrderRealtime(token,loadOrder);

  function finish(){clearCompletedCustomerFlow();router.replace("/cliente");router.refresh()}
  async function requestPayment(method:PaymentMethod){setBusy(true);setError("");try{const response=await fetch(`/api/order-payments/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trackingToken:token,method})}),body=await response.json();if(!response.ok)throw new Error(body.error??"Não foi possível solicitar o pagamento.");setPixQr(body.pixQrCode??null);setPixPayload(body.pixPayload??null);await loadOrder()}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível solicitar o pagamento.")}finally{setBusy(false)}}
  async function reportPix(){setBusy(true);try{const response=await fetch(`/api/order-payments/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({trackingToken:token,action:"REPORT_PIX"})}),body=await response.json();if(!response.ok)throw new Error(body.error);await loadOrder()}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível informar o pagamento.")}finally{setBusy(false)}}
  async function review(event:React.FormEvent){event.preventDefault();if(!rating)return;setBusy(true);try{const response=await fetch(`/api/order-reviews/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({trackingToken:token,rating,comment})}),body=await response.json();if(!response.ok)throw new Error(body.error);setReviewed(true);setTimeout(finish,1500)}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível enviar a avaliação.")}finally{setBusy(false)}}

  if(order?.status==="PAGO")return <Shell><section className="review-panel paid-complete"><span className="food-symbol" aria-hidden="true">✓</span><h1>Obrigado!</h1><p>Pagamento confirmado. Seu atendimento foi encerrado.</p>{error&&<p className="feedback-message error" role="alert">{error}</p>}{reviewed?<p className="feedback-message success">Obrigado pela sua avaliação! Voltando ao início...</p>:<form onSubmit={review}><h2>Avaliar pedido</h2><fieldset><legend>Sua nota</legend><div className="stars">{[1,2,3,4,5].map(value=><button type="button" key={value} aria-label={`${value} estrelas`} aria-pressed={rating===value} onClick={()=>setRating(value)}>{value<=rating?"★":"☆"}</button>)}</div></fieldset><label>Conte o que achou do pedido, do sabor ou deixe uma sugestão.<textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={1000}/></label><button className="solid-button" disabled={!rating||busy}>Enviar avaliação</button></form>}<button className="text-button" disabled={busy} onClick={finish}>{reviewed?"Voltar ao início":"Agora não, voltar ao início"}</button></section></Shell>;

  return <Shell><header className="simple-header"><Back href="/cliente/cardapio"/><h1>Acompanhar pedido</h1></header><section className="detail">{error&&<p className="feedback-message error" role="alert">{error}</p>}{!order&&!error&&<p className="empty-menu">Carregando pedido...</p>}{order&&<><div className="order-top"><div><p>Pedido <b>#{order.id}</b></p><small>Mesa {String(order.table).padStart(2,"0")}</small></div><strong>{orderStatusLabel(order.status)}</strong></div><h2>Itens do pedido</h2>{order.items.map(item=><div className="item-line" key={item.productId??item.name}><span>{item.quantity}x</span><div><b>{item.name}</b></div></div>)}<div className="total"><span>Total</span><b>{formatPrice(order.total)}</b></div>{cancelledWithinActiveVisit&&<section className="payment-panel"><p>Este pedido foi cancelado, mas seu atendimento continua aberto.</p><button className="solid-button" onClick={()=>router.replace("/cliente/cardapio")}>Fazer novo pedido</button></section>}{order.status==="ENTREGUE"&&!order.payment&&<section className="payment-panel"><h2>Pagar</h2><p>Escolha como deseja realizar o pagamento.</p><div className="payment-methods"><button disabled={busy} onClick={()=>void requestPayment("PIX")}>PIX</button><button disabled={busy} onClick={()=>void requestPayment("CARTAO")}>Cartão</button><button disabled={busy} onClick={()=>void requestPayment("DINHEIRO")}>Dinheiro</button></div></section>}{order.payment&&<section className="payment-panel"><h2>Pagamento</h2>{order.payment.method==="PIX"?<>{pixQr&&<img className="pix-qr" src={pixQr} alt="QR Code Pix"/>}{pixPayload&&<code className="pix-code">{pixPayload}</code>}<p>{order.payment.status==="CUSTOMER_REPORTED"?"Pagamento informado. Aguarde a confirmação do restaurante.":"Após pagar pelo Pix, informe ao restaurante."}</p>{order.payment.status==="REQUESTED"&&<button className="solid-button" disabled={busy} onClick={()=>void reportPix()}>Já realizei o pagamento</button>}</>:<p>Garçom solicitado para pagamento em {order.payment.method==="CARTAO"?"cartão":"dinheiro"}. Aguarde o atendimento e a confirmação.</p>}</section>}<p className="muted">Esta tela atualiza automaticamente quando o restaurante alterar o status.</p></>}</section></Shell>;
}
