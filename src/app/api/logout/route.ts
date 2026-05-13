import { clearAuthCookie } from "@/lib/session";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", clearAuthCookie());
  return response;
}
