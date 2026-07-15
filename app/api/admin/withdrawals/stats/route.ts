export const runtime = "nodejs";
import { type NextRequest } from "next/server";
import { handleGetWithdrawalStats } from "@/server/admin/withdrawal.controller";

export async function GET(req: NextRequest) {
  return handleGetWithdrawalStats(req);
}
