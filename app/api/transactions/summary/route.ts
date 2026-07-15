export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { handleGetTransactionSummary } from "@/server/transactions/transactions.controller";

export async function GET(req: NextRequest) {
  return handleGetTransactionSummary(req);
}
