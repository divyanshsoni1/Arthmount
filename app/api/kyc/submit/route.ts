import { type NextRequest } from "next/server";
import { handleSubmitKyc } from "@/server/kyc/kyc.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSubmitKyc(req);
}
