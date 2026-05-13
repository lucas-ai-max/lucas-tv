import { NextRequest } from "next/server";
import { createUser } from "@/lib/auth";
import { buildAuthCookie, createSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  const result = await createUser(username, password);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const token = await createSessionToken({
    userId: result.user.id,
    username: result.user.username,
    displayName: result.user.displayName,
  });

  const response = Response.json({ ok: true, user: result.user });
  response.headers.set("Set-Cookie", buildAuthCookie(token));
  return response;
}
