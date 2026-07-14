import { type NextRequest } from "next/server";
import { handleListPackages, handleCreatePackage } from "@/server/admin/packages.controller";
export const runtime = "nodejs";
export async function GET(req: NextRequest)  { return handleListPackages(req); }
export async function POST(req: NextRequest) { return handleCreatePackage(req); }
