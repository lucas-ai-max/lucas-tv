export function serverErrorResponse(error: unknown) {
  console.error(error);

  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = getPublicErrorMessage(rawMessage);

  return Response.json({ error: message }, { status: 500 });
}

function getPublicErrorMessage(message: string) {
  if (message.includes("is not configured")) {
    return "Banco de dados nao configurado na Vercel. Configure as variaveis SUPABASE_DB_*. ";
  }

  if (message.includes("password authentication failed")) {
    return "Senha ou usuario do banco incorreto na Vercel. Confira SUPABASE_DB_USER e SUPABASE_DB_PASSWORD, sem aspas.";
  }

  if (
    message.includes("Tenant or user not found") ||
    message.includes("tenant/user")
  ) {
    return "Host ou usuario do pooler Supabase incorreto. Confira SUPABASE_DB_HOST e SUPABASE_DB_USER.";
  }

  if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
    return "Host do banco nao encontrado. Use o Session Pooler IPv4 do Supabase em SUPABASE_DB_HOST.";
  }

  if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
    return "Tempo esgotado conectando ao Supabase. Confira o host do pooler e tente redeploy.";
  }

  return "Nao foi possivel conectar ao banco agora. Confira as variaveis SUPABASE_DB_* na Vercel.";
}
