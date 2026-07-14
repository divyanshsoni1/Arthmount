import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { prisma }                         from "@/lib/prisma";

export const runtime = "nodejs";

const SESSION_COOKIE = "arthmount_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  // Stamp sessionRevokedAt so all previously issued JWTs for this user are
  // invalidated at the /api/auth/me revocation check. Do this before clearing
  // the cookie so there is no window where an old token is still accepted.
  if (token) {
    try {
      const payload = await verifySessionToken(token);
      await prisma.user.update({
        where: { id: payload.userId },
        data:  { sessionRevokedAt: new Date() },
      });
      console.log(JSON.stringify({
        ts:      new Date().toISOString(),
        service: "auth",
        event:   "session.revoked",
        userId:  payload.userId,
      }));
    } catch {
      // Token already expired or invalid — nothing to revoke, proceed silently
    }
  }

  const res = NextResponse.json({ success: true });

  // Expire the cookie immediately
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });

  // Prevent the browser from serving a cached version of this response
  res.headers.set("Cache-Control", "no-store");

  return res;
}
