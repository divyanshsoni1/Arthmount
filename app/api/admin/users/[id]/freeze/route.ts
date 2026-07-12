import { type NextRequest } from "next/server";
import { handleFreezeUser } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleFreezeUser(req, id);
}
