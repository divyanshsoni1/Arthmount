import { type NextRequest } from "next/server";
import { handleToggleMarket } from "@/server/admin/trading-calendar.controller";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleToggleMarket(req, id); }
