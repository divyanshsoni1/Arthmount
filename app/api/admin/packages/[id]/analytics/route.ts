import { type NextRequest } from "next/server";
import { handleGetPackageAnalytics } from "@/server/admin/packages.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; return handleGetPackageAnalytics(req, id);
}
