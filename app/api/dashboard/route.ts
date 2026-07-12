import { type NextRequest } from "next/server";
import { handleGetSummary } from "@/server/dashboard/dashboard.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleGetSummary(req); }
