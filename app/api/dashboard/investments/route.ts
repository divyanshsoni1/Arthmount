import { type NextRequest } from "next/server";
import { handleGetInvestments } from "@/server/dashboard/dashboard.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleGetInvestments(req); }
