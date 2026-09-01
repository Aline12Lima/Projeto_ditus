import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export async function listTables(client: DbClient) {
  const { data, error } = await client.from("restaurant_tables").select("*").order("number");
  if (error) throw error;
  return data.map((table) => ({ id:table.id,number:table.number,status:table.status,created_at:table.created_at,updated_at:table.updated_at }));
}

export async function getTableSession(client: DbClient, tableNumber: number) {
  const { data: table, error } = await client.from("restaurant_tables").select("*").eq("number", tableNumber).maybeSingle();
  if (error) throw error;
  if (!table) return null;
  const { data: session, error: sessionError } = await client.from("table_sessions").select("*").eq("table_id", table.id).eq("status", "ABERTA").maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return { table, session: null, orders: [] };
  const { data: orders, error: ordersError } = await client.from("orders").select("*").eq("session_id", session.id).order("created_at");
  if (ordersError) throw ordersError;
  return { table, session, orders };
}
