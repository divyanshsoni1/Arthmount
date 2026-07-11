import { type NextRequest } from "next/server";
import { handleSignupComplete } from "@/server/auth/signup.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSignupComplete(req);
}
