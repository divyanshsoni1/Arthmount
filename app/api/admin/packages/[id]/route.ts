import { type NextRequest } from "next/server";
import {
  handleGetPackage, handleUpdatePackage, handleDeletePackage,
} from "@/server/admin/packages.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest,    { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleGetPackage(req, id); }
export async function PATCH(req: NextRequest,  { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleUpdatePackage(req, id); }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return handleDeletePackage(req, id); }
