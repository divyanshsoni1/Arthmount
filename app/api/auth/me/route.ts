import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { findUserById }                   from "@/server/auth/auth.repository";
import { prisma }                         from "@/lib/prisma";

export const runtime = "nodejs";

const SESSION_COOKIE = "arthmount_session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const payload = await verifySessionToken(token);
    const user    = await findUserById(payload.userId);

    if (!user) {
      // Token valid but user deleted — clear the stale cookie
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    // ── Token revocation check ──────────────────────────────────────────────
    // sessionRevokedAt is stamped on every logout. If the JWT was issued
    // BEFORE that timestamp the user has since logged out — treat as expired.
    const revokedAt = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: { sessionRevokedAt: true },
    });

    if (revokedAt?.sessionRevokedAt && payload.iat) {
      const issuedAt = payload.iat; // seconds
      const revokedAtSec = Math.floor(revokedAt.sessionRevokedAt.getTime() / 1000);
      if (issuedAt < revokedAtSec) {
        // Token was issued before the last logout — revoke it
        const res = NextResponse.json({ user: null }, { status: 200 });
        res.cookies.delete(SESSION_COOKIE);
        return res;
      }
    }

    return NextResponse.json({
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email ?? null,
        role:  user.role,
      },
    });
  } catch {
    // Token expired or tampered — clear it
    const res = NextResponse.json({ user: null }, { status: 200 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}
