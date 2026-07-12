import { type NextRequest } from "next/server";
import { handleListUsers } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleListUsers(req); }
