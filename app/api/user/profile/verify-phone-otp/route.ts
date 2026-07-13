import { type NextRequest } from "next/server";
import { handleVerifyPhoneOtp } from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleVerifyPhoneOtp(req);
}
