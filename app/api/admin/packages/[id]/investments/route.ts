import { type NextRequest } from "next/server";
import { handleGetPackageInvestments } from "@/server/admin/packages.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; return handleGetPackageInvestments(req, id);
}
