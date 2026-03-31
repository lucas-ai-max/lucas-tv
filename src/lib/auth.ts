export const AUTH_COOKIE = "lucas-tv-auth";

const VALID_USERS = [
  { username: "lucas", password: "lucas123" },
  { username: "acessolivre", password: "acessolivre" },
];

export function validateCredentials(username: string, password: string): boolean {
  return VALID_USERS.some(
    (u) => u.username === username && u.password === password
  );
}
