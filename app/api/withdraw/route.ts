export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import {
  handleGetSummary,
  handleRequestWithdrawal,
} from "@/server/withdraw/withdraw.controller";

export async function GET(req: NextRequest) {
  return handleGetSummary(req);
}

export async function POST(req: NextRequest) {
  return handleRequestWithdrawal(req);
}
