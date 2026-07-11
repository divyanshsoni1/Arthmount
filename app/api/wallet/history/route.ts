import { type NextRequest } from "next/server";
import { handleGetHistory } from "@/server/wallet/wallet.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleGetHistory(req); }
