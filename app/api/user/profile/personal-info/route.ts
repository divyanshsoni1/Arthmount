import { type NextRequest } from "next/server";
import { handleUpdatePersonalInfo } from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  return handleUpdatePersonalInfo(req);
}
