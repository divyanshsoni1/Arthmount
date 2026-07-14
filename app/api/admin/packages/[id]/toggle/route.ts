import { type NextRequest } from "next/server";
import { handleTogglePackage } from "@/server/admin/packages.controller";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; return handleTogglePackage(req, id);
}
