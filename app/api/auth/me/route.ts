import { type NextRequest, NextResponse } from "next/server";
import { verifySessionToken }             from "@/lib/jwt";
import { findUserById }                   from "@/server/auth/auth.repository";

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
