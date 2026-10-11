export type NewAdminRole = "admin" | "editor" | "super_admin";
export type NewAdminUser = { email: string; username: string; password: string; role: NewAdminRole };

export function parseNewAdminUser(input: unknown): { value: NewAdminUser; error?: never } | { value?: never; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Invalid request." };
  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role ?? "admin";

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) return { error: "Enter a valid email address." };
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(username)) return { error: "Username must be 3–32 characters using letters, numbers, dots, hyphens, or underscores." };
  if (password.length < 8 || password.length > 128 || password.trim().length < 8) return { error: "Password must be 8–128 characters and cannot be only spaces." };
  if (role !== "admin" && role !== "editor" && role !== "super_admin") return { error: "Choose a valid role." };
  return { value: { email, username, password, role } };
}
