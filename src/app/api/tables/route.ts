import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/errors";
import { requireStaff } from "@/lib/api/auth";
import { listTables } from "@/server/services/tables";

export async function GET() {
  try {
    const { admin } = await requireStaff();
    return NextResponse.json(await listTables(admin));
  } catch (error) { return apiErrorResponse(error); }
}
