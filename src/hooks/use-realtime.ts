"use client";

import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function useAdminRealtime(onChange: () => void) {
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
      const channel = supabase.channel("admin-operations")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, onChange)
        .subscribe();
      unsubscribe = () => { void supabase.removeChannel(channel); };
    }
    void subscribe();
    return () => { disposed = true; unsubscribe?.(); };
  }, [onChange]);
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
