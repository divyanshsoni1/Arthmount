import { type NextRequest } from "next/server";
import { handleSubmitFull } from "@/server/kyc/kyc.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSubmitFull(req);
}
