import { type NextRequest } from "next/server";
import { handleSendPhoneOtp } from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleSendPhoneOtp(req);
}
