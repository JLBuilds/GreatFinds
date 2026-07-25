import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * True when the currently logged-in user's email is listed in the
 * ADMIN_EMAILS env var (comma-separated, case-insensitive). The admin
 * list is intentionally env-managed rather than DB-managed so it can't
 * be elevated via SQL injection or a leaked auth token.
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.toLowerCase());
}

/** Throws if the current user isn't admin. Use in server actions. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Forbidden: admin access required");
  }
}
