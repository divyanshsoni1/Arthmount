import { type NextRequest } from "next/server";
import { handleGetWallet } from "@/server/wallet/wallet.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleGetWallet(req); }
