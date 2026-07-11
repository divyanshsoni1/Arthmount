import { type NextRequest } from "next/server";
import { handleLogin } from "@/server/auth/auth.controller";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleLogin(req);
}
