import { type NextRequest } from "next/server";
import { handleGetAuditLogs } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleGetAuditLogs(req); }
