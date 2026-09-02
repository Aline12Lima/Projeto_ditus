import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function forceCloseTableSession(client: SupabaseClient<Database>, tableNumber: number, adminId: string) {
  const { data, error } = await client.rpc("force_close_table_session", {
    requested_table_number: tableNumber,
    requested_admin_id: adminId,
  });
  if (error) throw error;
  return data[0];
}
