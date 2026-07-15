export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { handleGetFees } from "@/server/withdraw/withdraw.controller";

export async function GET(req: NextRequest) {
  return handleGetFees(req);
}
