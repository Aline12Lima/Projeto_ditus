import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { z } from "zod";
import type { createOrderSchema } from "@/lib/api/schemas";
import { formatPrice } from "@/lib/formatters";

type DbClient = SupabaseClient<Database>;
type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function createOrder(client: DbClient, input: CreateOrderInput) {
  const { data, error } = await client.rpc("create_customer_order", {
    requested_customer_name: input.customerName,
    requested_customer_token: input.customerToken,
    requested_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    requested_notes: input.notes,
    requested_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data[0];
}

export async function getOrder(client: DbClient, id: number) {
  const { data: order, error } = await client.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!order) return null;
  const [{ data: session, error: sessionError }, { data: items, error: itemsError }] = await Promise.all([
    client.from("table_sessions").select("*").eq("id", order.session_id).single(),
    client.from("order_items").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (sessionError) throw sessionError;
  if (itemsError) throw itemsError;
  const { data: table, error: tableError } = await client.from("restaurant_tables").select("*").eq("id", session.table_id).single();
  if (tableError) throw tableError;
  return {
    id: order.id, table: table.number, customerName: session.customer_name ?? undefined,
    items: items.map((item) => ({ productId: item.product_id, name: item.product_name, price: formatPrice(Number(item.unit_price)), quantity: item.quantity })),
    total: Number(order.total), status: order.status, createdAt: order.created_at,
    paidAt: order.paid_at ?? undefined, notes: order.notes, sessionId: order.session_id,
    trackingToken: order.tracking_token,
  };
}

export async function listOrders(client: DbClient, tableNumber?: number) {
  const { data: orders, error } = await client.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const hydrated = await Promise.all(orders.map((order) => getOrder(client, order.id)));
  return hydrated.filter((order) => order && (tableNumber === undefined || order.table === tableNumber));
}

export async function transitionOrder(client: DbClient, id: number, status: Database["public"]["Enums"]["order_status"]) {
  const { data, error } = await client.rpc("transition_order_status", { requested_order_id: id, requested_status: status });
  if (error) throw error;
  return data;
}
