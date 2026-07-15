import { type NextRequest } from "next/server";
import {
  handleWalletInvest,
  handleGetInvestments,
} from "@/server/invest/invest.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest)  { return handleGetInvestments(req); }
export async function POST(req: NextRequest) { return handleWalletInvest(req); }
