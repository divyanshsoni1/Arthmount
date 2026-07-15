import { type NextRequest } from "next/server";
import { handleCreateInvestOrder } from "@/server/invest/invest.controller";
export const runtime = "nodejs";
export async function POST(req: NextRequest) { return handleCreateInvestOrder(req); }
