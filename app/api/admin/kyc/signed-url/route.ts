/**
 * GET /api/admin/kyc/signed-url?key=<objectKey>
 *
 * Returns a short-lived (60-minute) pre-signed URL for the given S3 object key.
 * Only accessible to ADMIN / SUPER_ADMIN roles.
 * Never exposes internal storage URLs or keys to the browser directly.
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { getSignedUrl }                   from "@/lib/storage/minio";
import { successResponse, errorResponse } from "@/server/auth/auth.controller";

export const runtime = "nodejs";

const SESSION_COOKIE = "arthmount_session";
const ADMIN_ROLES    = new Set(["ADMIN", "SUPER_ADMIN"]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return errorResponse("Unauthenticated.", "UNAUTHENTICATED", 401);

    let payload: Awaited<ReturnType<typeof verifySessionToken>>;
    try {
      payload = await verifySessionToken(token);
    } catch {
      return errorResponse("Session expired.", "SESSION_EXPIRED", 401);
    }

    if (!ADMIN_ROLES.has(payload.role)) {
      return errorResponse("Forbidden.", "FORBIDDEN", 403);
    }

    // ── Key validation ──────────────────────────────────────────────────────
    const url = new URL(req.url);
    const key = url.searchParams.get("key");

    if (!key || !key.trim()) {
      return errorResponse("Object key is required.", "BAD_REQUEST", 400);
    }

    // Only allow keys under the kyc/ prefix (prevents arbitrary file access)
    if (!key.startsWith("kyc/")) {
      return errorResponse("Access denied for this object key.", "FORBIDDEN", 403);
    }

    // ── Generate signed URL (60-min expiry) ─────────────────────────────────
    const signedUrl = await getSignedUrl(key.trim(), 3600);

    return successResponse({ url: signedUrl, expiresIn: 3600 });
  } catch (err) {
    console.error("[signed-url] Error:", err);
    return errorResponse("Failed to generate signed URL.", "INTERNAL_ERROR", 500);
  }
}
