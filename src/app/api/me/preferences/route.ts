import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  return Response.json({ preferences: user.preferences });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!isPlainObject(body?.preferences)) {
    return Response.json({ error: "Preferencias invalidas" }, { status: 400 });
  }

  const result = await query<{ preferences: Record<string, unknown> }>(
    `
      update public.app_users
      set preferences = preferences || $2::jsonb
      where id = $1
      returning preferences
    `,
    [user.id, JSON.stringify(body.preferences)]
  );

  return Response.json({ preferences: result.rows[0].preferences });
}
