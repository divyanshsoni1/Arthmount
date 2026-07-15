export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { handleCancelWithdrawal } from "@/server/withdraw/withdraw.controller";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleCancelWithdrawal(req, id);
}
