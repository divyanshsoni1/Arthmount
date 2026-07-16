import { type NextRequest } from "next/server";
import { handleGetSignedImages } from "@/server/kyc/kyc.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleGetSignedImages(req);
}
