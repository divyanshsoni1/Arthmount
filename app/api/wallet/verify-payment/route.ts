import { type NextRequest } from "next/server";
import { handleVerifyPayment } from "@/server/wallet/wallet.controller";
export const runtime = "nodejs";
export async function POST(req: NextRequest) { return handleVerifyPayment(req); }
