import { type NextRequest } from "next/server";
import { handleListKyc } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleListKyc(req); }
