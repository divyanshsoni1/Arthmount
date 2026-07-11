import { type NextRequest } from "next/server";
import { handleSignupVerifyOtp } from "@/server/auth/signup.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSignupVerifyOtp(req);
}
