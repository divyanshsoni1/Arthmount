import { type NextRequest } from "next/server";
import { handleGetUser } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetUser(req, id);
}
