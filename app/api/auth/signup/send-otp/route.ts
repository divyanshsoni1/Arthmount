import { type NextRequest } from "next/server";
import { handleSignupSendOtp } from "@/server/auth/signup.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSignupSendOtp(req);
}
