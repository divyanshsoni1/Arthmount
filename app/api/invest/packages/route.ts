import { type NextRequest } from "next/server";
import { handleListPackages } from "@/server/invest/invest.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest) { return handleListPackages(req); }
