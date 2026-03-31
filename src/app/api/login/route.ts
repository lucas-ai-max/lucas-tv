import { NextRequest } from "next/server";
import { validateCredentials, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!validateCredentials(username, password)) {
    return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    `${AUTH_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
  return response;
}
