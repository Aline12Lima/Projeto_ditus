import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireStaff } from "@/lib/api/auth";
import { updateProductSchema } from "@/lib/api/schemas";
import { updateProduct } from "@/server/services/products";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireStaff();
    const { id } = await context.params;
    return NextResponse.json(await updateProduct(admin, id, updateProductSchema.parse(await request.json())));
  } catch (error) { return apiErrorResponse(error); }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { admin } = await requireStaff();
    const { id } = await context.params;
    return NextResponse.json(await updateProduct(admin, id, { active: false }));
  } catch (error) { return apiErrorResponse(error); }
}
