import { serverErrorResponse } from "@/lib/api-errors";
import { getCurrentUser } from "@/lib/auth";
import { removeFromContinueWatching } from "@/lib/watch-progress";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { progressId } = await request.json().catch(() => ({ progressId: null }));
    if (typeof progressId !== "string" || progressId.length === 0) {
      return Response.json({ error: "Item invalido" }, { status: 400 });
    }

    await removeFromContinueWatching(user.id, progressId);
    return Response.json({ ok: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
