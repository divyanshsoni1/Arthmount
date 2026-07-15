import { type NextRequest } from "next/server";
import { handleVerifyInvestPayment } from "@/server/invest/invest.controller";
export const runtime = "nodejs";
export async function POST(req: NextRequest) { return handleVerifyInvestPayment(req); }
