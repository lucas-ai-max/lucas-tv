export function serverErrorResponse(error: unknown) {
  console.error(error);

  const message =
    error instanceof Error && error.message.includes("is not configured")
      ? "Banco de dados nao configurado na Vercel. Configure as variaveis SUPABASE_DB_*."
      : "Nao foi possivel concluir agora. Tente novamente em instantes.";

  return Response.json({ error: message }, { status: 500 });
}
