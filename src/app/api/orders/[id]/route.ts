import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { orderStatusSchema } from "@/lib/api/schemas";
import { requireStaff } from "@/lib/api/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getOrder, transitionOrder } from "@/server/services/orders";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const order = await getOrder(createAdminSupabaseClient(), Number(id));
    if (!order) throw new ApiError(404, "Pedido não encontrado.");
    const token = request.nextUrl.searchParams.get("token");
    if (token !== order.trackingToken) await requireStaff();
    return NextResponse.json(order);
  } catch (error) { return apiErrorResponse(error); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireStaff();
    const { id } = await context.params;
    const { status } = await request.json();
    return NextResponse.json(await transitionOrder(admin, Number(id), orderStatusSchema.parse(status)));
  } catch (error) { return apiErrorResponse(error); }
}
