import "server-only";

import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/session";

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  preferences: Record<string, unknown>;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  preferences: Record<string, unknown>;
}

function normalizeUsername(username: unknown) {
  return String(username || "").trim().toLowerCase();
}

function normalizePassword(password: unknown) {
  return String(password || "");
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    preferences: row.preferences || {},
  };
}

export function validateSignupInput(username: unknown, password: unknown) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = normalizePassword(password);

  if (normalizedUsername.length < 2 || normalizedUsername.length > 80) {
    return {
      ok: false as const,
      error: "Use um usuario com pelo menos 2 caracteres.",
    };
  }

  if (normalizedPassword.length === 0) {
    return {
      ok: false as const,
      error: "Digite uma senha.",
    };
  }

  return {
    ok: true as const,
    username: normalizedUsername,
    password: normalizedPassword,
  };
}

export async function authenticateUser(username: unknown, password: unknown) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = normalizePassword(password);

  const result = await query<UserRow>(
    `
      select id, username, display_name, preferences
      from public.app_users
      where lower(username) = $1
        and (
          password_hash = crypt(encode(digest($2, 'sha256'), 'hex'), password_hash)
          or password_hash = crypt($2, password_hash)
        )
      limit 1
    `,
    [normalizedUsername, normalizedPassword]
  );

  return result.rows[0] ? toAppUser(result.rows[0]) : null;
}

export async function createUser(username: unknown, password: unknown) {
  const input = validateSignupInput(username, password);
  if (!input.ok) {
    return input;
  }

  try {
    const result = await query<UserRow>(
      `
        insert into public.app_users (username, display_name, password_hash)
        values ($1, $1, crypt(encode(digest($2, 'sha256'), 'hex'), gen_salt('bf')))
        returning id, username, display_name, preferences
      `,
      [input.username, input.password]
    );

    return { ok: true as const, user: toAppUser(result.rows[0]) };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false as const, error: "Esse usuario ja existe." };
    }
    throw error;
  }
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;

  const result = await query<UserRow>(
    `
      select id, username, display_name, preferences
      from public.app_users
      where id = $1
      limit 1
    `,
    [session.userId]
  );

  return result.rows[0] ? toAppUser(result.rows[0]) : null;
}
