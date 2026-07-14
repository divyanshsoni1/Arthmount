import { type NextRequest } from "next/server";
import {
  handleGetDay,
  handleUpdateDay,
  handleDeleteDay,
} from "@/server/admin/trading-calendar.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest,    { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleGetDay(req, id); }
export async function PATCH(req: NextRequest,  { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleUpdateDay(req, id); }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleDeleteDay(req, id); }
