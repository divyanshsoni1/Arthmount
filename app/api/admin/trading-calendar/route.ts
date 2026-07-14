import { type NextRequest } from "next/server";
import {
  handleGetCalendar,
  handleCreateDay,
} from "@/server/admin/trading-calendar.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest)  { return handleGetCalendar(req); }
export async function POST(req: NextRequest) { return handleCreateDay(req); }
