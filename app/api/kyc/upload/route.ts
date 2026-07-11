import { type NextRequest } from "next/server";
import { handleUploadDocument } from "@/server/kyc/kyc.controller";

export const runtime = "nodejs";

// Required for FormData / file uploads in Next.js App Router
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleUploadDocument(req);
}
