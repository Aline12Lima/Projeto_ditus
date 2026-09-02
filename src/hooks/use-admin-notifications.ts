"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRealtime } from "@/hooks/use-realtime";
import { notificationFromAdminEvent, type AdminNotification, type AdminRealtimeEvent } from "@/lib/admin-notifications";

export type VisibleAdminNotification = AdminNotification & { id: string; detail?: string };

const STORAGE_KEY = "ditus-admin-notifications-seen";
const MAX_SEEN = 100;

function readSeen() {
  try { return new Set<string>(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]")); }
  catch { return new Set<string>(); }
}

export function useAdminNotifications(onChange: () => void) {
  const [notifications, setNotifications] = useState<VisibleAdminNotification[]>([]);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const seenRef = useRef<Set<string> | null>(null);
  const refreshRef = useRef(onChange);
  useEffect(() => { refreshRef.current = onChange; }, [onChange]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const handleEvent = useCallback(async (event: AdminRealtimeEvent) => {
    refreshRef.current();
    const notification = notificationFromAdminEvent(event);
    if (!notification) return;

    if (notification.visitId) {
      const response = await fetch("/api/admin/customer-visits", { cache: "no-store" });
      if (!response.ok) return;
      const visits = await response.json() as Array<{ visitId: string }>;
      if (!visits.some((visit) => visit.visitId === notification.visitId)) return;
    }

    let detail: string | undefined;
    if (notification.orderId) {
      const response = await fetch(`/api/orders/${notification.orderId}`, { cache: "no-store" });
      if (response.ok) {
        const order = await response.json() as { table?: number };
        if (order.table) detail = `Pedido #${notification.orderId} · Mesa ${String(order.table).padStart(2, "0")}`;
      }
      detail ??= `Pedido #${notification.orderId}`;
    }

    seenRef.current ??= readSeen();
    if (seenRef.current.has(notification.key)) return;
    seenRef.current.add(notification.key);
    const recent = [...seenRef.current].slice(-MAX_SEEN);
    seenRef.current = new Set(recent);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recent));

    const visible = { ...notification, detail, id: crypto.randomUUID() };
    setNotifications((current) => [...current.slice(-3), visible]);
    window.setTimeout(() => dismiss(visible.id), 6500);
  }, [dismiss]);

  const handleStatus = useCallback((subscribed: boolean) => setRealtimeReady(subscribed), []);
  useAdminRealtime(handleEvent, handleStatus);
  return { notifications, dismiss, realtimeReady };
}
