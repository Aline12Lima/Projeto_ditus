"use client";

import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AdminRealtimeEvent } from "@/lib/admin-notifications";

export function useAdminRealtime(onChange: (event: AdminRealtimeEvent) => void, onStatus?: (subscribed: boolean) => void) {
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let client;
    try { client = createBrowserSupabaseClient(); } catch { return; }
    const supabase = client;
    async function subscribe() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || disposed) return;
      await supabase.realtime.setAuth(session.access_token);
      if (disposed) return;
      const notify = (payload: { table: string; eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => onChange(payload as AdminRealtimeEvent);
      const channel = supabase.channel("admin-operations")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, notify)
        .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, notify)
        .on("postgres_changes", { event: "*", schema: "public", table: "customer_visits" }, notify)
        .on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, notify)
        .subscribe((status) => onStatus?.(status === "SUBSCRIBED"));
      unsubscribe = () => { void supabase.removeChannel(channel); };
    }
    void subscribe();
    return () => { disposed = true; onStatus?.(false); unsubscribe?.(); };
  }, [onChange, onStatus]);
}

export function useOrderRealtime(trackingToken: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!trackingToken) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let client;
    try { client = createBrowserSupabaseClient(); } catch { return; }
    const supabase = client;
    async function subscribe() {
      await Promise.resolve();
      if (disposed) return;
      const channel = supabase.channel(`order:${trackingToken}`)
        .on("broadcast", { event: "UPDATE" }, onChange)
        .subscribe();
      unsubscribe = () => { void supabase.removeChannel(channel); };
    }
    void subscribe();
    return () => { disposed = true; unsubscribe?.(); };
  }, [trackingToken, onChange]);
}

export function useCustomerVisitRealtime(trackingToken:string|undefined,onChange:()=>void){
 useEffect(()=>{if(!trackingToken)return;let client;try{client=createBrowserSupabaseClient()}catch{return}const supabase=client;const channel=supabase.channel(`customer-visit:${trackingToken}`).on("broadcast",{event:"UPDATE"},onChange).subscribe();return()=>{void supabase.removeChannel(channel)}},[trackingToken,onChange]);
}
