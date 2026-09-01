import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await createAdminSupabaseClient().from("categories").select("*").eq("active", true).order("created_at");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) { return apiErrorResponse(error); }
}
