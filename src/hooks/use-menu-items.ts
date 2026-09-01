"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dish } from "@/types/menu";

export function useMenuItems(includeInactive = false, locale: "pt" | "en" | "es" = "pt") {
  const [items, setItems] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ lang: locale });
      if (includeInactive) params.set("includeInactive", "true");
      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar o cardápio.");
      setItems(body as Dish[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar o cardápio.");
    } finally { setLoading(false); }
  }, [includeInactive, locale]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { items, loading, error, refresh };
}
