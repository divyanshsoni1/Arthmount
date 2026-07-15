export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { handleGetDetail } from "@/server/withdraw/withdraw.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGetDetail(req, id);
}
