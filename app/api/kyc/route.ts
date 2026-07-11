import { type NextRequest } from "next/server";
import { handleGetKyc, handleSaveIdentity } from "@/server/kyc/kyc.controller";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleGetKyc(req);
}

export async function POST(req: NextRequest) {
  return handleSaveIdentity(req);
}
