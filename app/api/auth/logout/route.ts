import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SESSION_COOKIE = "arthmount_session";

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true });

  // Expire the cookie immediately by setting maxAge to 0
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   0,
    path:     "/",
  });

  return res;
}
