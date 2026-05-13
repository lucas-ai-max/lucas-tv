import { NextRequest } from "next/server";
import { serverErrorResponse } from "@/lib/api-errors";
import { authenticateUser } from "@/lib/auth";
import { buildAuthCookie, createSessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const user = await authenticateUser(username, password);

    if (!user) {
      return Response.json({ error: "Credenciais invalidas" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    const response = Response.json({ ok: true, user });
    response.headers.set("Set-Cookie", buildAuthCookie(token));
    return response;
  } catch (error) {
    return serverErrorResponse(error);
  }
}
