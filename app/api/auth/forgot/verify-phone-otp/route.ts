import { type NextRequest } from "next/server";
import { handleFpVerifyPhoneOtp } from "@/server/auth/forgot.controller";
export const runtime = "nodejs";
export async function POST(req: NextRequest) { return handleFpVerifyPhoneOtp(req); }
