import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireStaff } from "@/lib/api/auth";
import { productSchema } from "@/lib/api/schemas";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createProduct, listProducts } from "@/server/services/products";

export async function GET(request: NextRequest) {
  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const requestedLocale = request.nextUrl.searchParams.get("lang");
    const locale = requestedLocale === "en" || requestedLocale === "es" ? requestedLocale : "pt";
    const client = includeInactive ? (await requireStaff()).admin : createAdminSupabaseClient();
    return NextResponse.json(await listProducts(client, includeInactive, locale));
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireStaff();
    const input = productSchema.parse(await request.json());
    return NextResponse.json(await createProduct(admin, input), { status: 201 });
  } catch (error) { return apiErrorResponse(error); }
}
