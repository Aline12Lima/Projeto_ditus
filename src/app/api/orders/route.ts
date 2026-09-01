import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireStaff } from "@/lib/api/auth";
import { createOrderSchema } from "@/lib/api/schemas";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createOrder, listOrders } from "@/server/services/orders";

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireStaff();
    const tableValue = request.nextUrl.searchParams.get("table");
    const table = tableValue ? Number(tableValue) : undefined;
    return NextResponse.json(await listOrders(admin, table));
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const input = createOrderSchema.parse(await request.json());
    const order = await createOrder(createAdminSupabaseClient(), input);
    return NextResponse.json(order, { status: 201 });
  } catch (error) { return apiErrorResponse(error); }
}
