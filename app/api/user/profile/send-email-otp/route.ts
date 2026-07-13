import { type NextRequest } from "next/server";
import { handleSendEmailOtp } from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSendEmailOtp(req);
}
