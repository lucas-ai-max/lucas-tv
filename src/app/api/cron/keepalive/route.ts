import { NextRequest } from "next/server";
import { serverErrorResponse } from "@/lib/api-errors";
import { query } from "@/lib/db";

export const runtime = "nodejs";

// Called daily by Vercel Cron (see vercel.json) so the free-tier Supabase
// project never reaches its ~7-day inactivity threshold and auto-pauses.
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Touch a real table, not just `select 1`, so it registers as DB activity.
    const result = await query<{ users: string }>(
      "select count(*)::text as users from public.app_users"
    );

    return Response.json({
      ok: true,
      users: Number(result.rows[0]?.users ?? 0),
      at: new Date().toISOString(),
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
