import { type NextRequest } from "next/server";
import { handleChangeUserRole } from "@/server/admin/admin.controller";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleChangeUserRole(req, id);
}
