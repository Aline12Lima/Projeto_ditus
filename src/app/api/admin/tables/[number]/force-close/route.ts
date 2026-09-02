import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { ApiError, apiErrorResponse } from "@/lib/api/errors";
import { forceCloseTableSession } from "@/server/services/tables-admin";

export async function POST(_request: Request, context: { params: Promise<{ number: string }> }) {
  try {
    const { number } = await context.params;
    const tableNumber = Number(number);
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 45) throw new ApiError(400, "Mesa inválida.");
    const { admin, user } = await requireAdmin();
    return NextResponse.json(await forceCloseTableSession(admin, tableNumber, user.id));
  } catch (error) { return apiErrorResponse(error); }
}
