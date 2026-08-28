import { NextResponse } from "next/server";import { requireStaff } from "@/lib/api/auth";import { apiErrorResponse } from "@/lib/api/errors";import { listWaitingVisits } from "@/server/services/customer-visits";
export async function GET(){try{const {admin}=await requireStaff();return NextResponse.json(await listWaitingVisits(admin))}catch(error){return apiErrorResponse(error)}}
