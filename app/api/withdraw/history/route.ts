export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { handleGetHistory } from "@/server/withdraw/withdraw.controller";

export async function GET(req: NextRequest) {
  return handleGetHistory(req);
}
