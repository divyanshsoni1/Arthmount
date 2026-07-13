import { type NextRequest } from "next/server";
import { handleVerifyEmailOtp } from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleVerifyEmailOtp(req);
}
