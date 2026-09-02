"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomerVisitRealtime } from "@/hooks/use-realtime";
import { customerFlowStartPath, getTableAccess, resetCustomerFlow, shouldResetCustomerFlow } from "@/lib/customer-flow";
import { getLastOrder } from "@/lib/orders";

const CLOSED_MESSAGE = "Este atendimento foi encerrado. Você pode iniciar um novo atendimento.";

export function CustomerFlowLifecycle() {
  const router = useRouter();
  const resetting = useRef(false);
  const [visitTrackingToken, setVisitTrackingToken] = useState<string>();

  useEffect(() => setVisitTrackingToken(localStorage.getItem("ditus-visit-tracking-token") ?? undefined), []);

  const verifyVisit = useCallback(async () => {
    if (resetting.current) return;
    const customerToken = localStorage.getItem("ditus-customer-token");
    if (!customerToken) return;
    const visitResponse = await fetch(`/api/customer-visits?token=${encodeURIComponent(customerToken)}`, { cache: "no-store" });
    if (visitResponse.status !== 404) return;

    const lastOrder = getLastOrder();
    let currentOrderStatus: string | undefined;
    if (lastOrder?.trackingToken) {
      const orderResponse = await fetch(`/api/orders/${lastOrder.id}?token=${encodeURIComponent(lastOrder.trackingToken)}`, { cache: "no-store" });
      if (orderResponse.ok) currentOrderStatus = (await orderResponse.json() as { status?: string }).status;
    }
    if (!shouldResetCustomerFlow(visitResponse.status, currentOrderStatus)) return;

    resetting.current = true;
    const preserveTableAccess = Boolean(getTableAccess());
    const startPath = customerFlowStartPath();
    const destination = `${startPath}${startPath.includes("?") ? "&" : "?"}encerrado=1`;
    resetCustomerFlow({ preserveTableAccess, message: CLOSED_MESSAGE });
    router.replace(destination);
    router.refresh();
  }, [router]);

  useCustomerVisitRealtime(visitTrackingToken, verifyVisit);
  return null;
}
