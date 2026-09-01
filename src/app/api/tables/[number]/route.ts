import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError } from "@/lib/api/errors";
import { requireStaff } from "@/lib/api/auth";
import { getTableSession } from "@/server/services/tables";

export async function GET(_request: Request, context: { params: Promise<{ number: string }> }) {
  try {
    const { admin } = await requireStaff();
    const { number } = await context.params;
    const result = await getTableSession(admin, Number(number));
    if (!result) throw new ApiError(404, "Mesa não encontrada.");
    return NextResponse.json(result);
  } catch (error) { return apiErrorResponse(error); }
}
