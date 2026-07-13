import { type NextRequest } from "next/server";
import {
  handleGetProfile,
  handleUpdateProfile,
} from "@/server/profile/profile.controller";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleGetProfile(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdateProfile(req);
}
