export const runtime = "nodejs";
import { type NextRequest } from "next/server";
import {
  handleGetWithdrawalDetail,
  handleUpdateWithdrawalStatus,
} from "@/server/admin/withdrawal.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGetWithdrawalDetail(req, id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdateWithdrawalStatus(req, id);
}
