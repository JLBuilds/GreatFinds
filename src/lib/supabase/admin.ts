import "server-only";
import { createClient } from "@supabase/supabase-js";

/** True when both env vars needed for the service-role client are present. */
export function isAdminClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Service-role Supabase client for server-only admin operations.
 * Bypasses RLS — must never be exposed to the browser. Use only inside
 * server actions / server components guarded by isAdmin() or for
 * specifically server-enforced operations (e.g. validating an invite
 * token at signup time, where the user isn't yet authenticated).
 *
 * Throws if env vars are missing — callers that need to recover (e.g.
 * the /signup page) should check isAdminClientConfigured() first or
 * wrap the call in try/catch and surface a calm message instead of
 * crashing the route.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client misconfigured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
