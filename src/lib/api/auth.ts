import { ApiError } from "@/lib/api/errors";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireStaff() {
  const authClient = await createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) throw new ApiError(401, "Autenticação necessária.");
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("staff_profiles").select("role, active").eq("user_id", user.id).maybeSingle();
  if (!profile?.active) throw new ApiError(403, "Usuário sem acesso administrativo.");
  return { user, role: profile.role, admin };
}

export async function requireAdmin() {
  const context = await requireStaff();
  if (context.role !== "ADMIN") throw new ApiError(403, "Apenas administradores podem realizar esta operação.");
  return context;
}
