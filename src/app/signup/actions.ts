"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";

export type TokenValidation =
  | { valid: true; email: string; note: string | null }
  | {
      valid: false;
      reason: "missing" | "not_found" | "already_used" | "config_error";
    };

/**
 * Server-side token lookup. Uses the service-role client so it works
 * pre-auth (the user signing up isn't logged in yet) without exposing
 * the invites table to anon clients.
 *
 * Never throws — even when the service-role env vars are missing — so
 * the /signup route can show a calm message instead of crashing.
 */
export async function validateInviteToken(
  token: string | null | undefined,
): Promise<TokenValidation> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "missing" };
  }

  if (!isAdminClientConfigured()) {
    console.error(
      "[validateInviteToken] SUPABASE_SERVICE_ROLE_KEY missing at runtime",
    );
    return { valid: false, reason: "config_error" };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("invites")
      .select("email, accepted_at, note")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[validateInviteToken] supabase error:", error);
      return { valid: false, reason: "not_found" };
    }
    if (!data) return { valid: false, reason: "not_found" };
    if (data.accepted_at) return { valid: false, reason: "already_used" };
    return { valid: true, email: data.email, note: data.note };
  } catch (err) {
    console.error("[validateInviteToken] unexpected error:", err);
    return { valid: false, reason: "config_error" };
  }
}

/**
 * Signup form post. Validates the token a second time on the server
 * (defense in depth — the hidden field could be tampered with), confirms
 * the submitted email matches the invite, creates the auth user, then
 * marks the invite as accepted.
 */
export async function signupWithInvite(formData: FormData) {
  const token = (formData.get("token") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = formData.get("password") as string | null;

  if (!token || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Missing required fields.")}`);
  }

  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    const msg =
      validation.reason === "already_used"
        ? "This invite has already been used."
        : "This invite link doesn't work.";
    redirect(`/signup?error=${encodeURIComponent(msg)}`);
  }

  if (validation.email.toLowerCase() !== email) {
    redirect(
      `/signup?token=${token}&error=${encodeURIComponent("Email doesn't match the invite.")}`,
    );
  }

  // Create the auth user via the admin API with email_confirm:true so
  // they can sign in immediately. The previous flow used the anon
  // supabase.auth.signUp which forces an email-confirmation step —
  // that confirmation goes through Resend, which on the free tier
  // only delivers to one verified address, so the email never lands
  // and the account is stuck unconfirmed. Possession of the invite
  // token is already proof of authorisation, so auto-confirming is
  // safe.
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password: password as string,
    email_confirm: true,
  });

  if (createErr) {
    redirect(
      `/signup?token=${token}&error=${encodeURIComponent(createErr.message)}`,
    );
  }

  // Mark invite as accepted. Service-role write — bypasses RLS.
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  // Sign them in via the cookie-aware anon client so they land on the
  // app already authenticated. The onboarding gate in
  // (app)/layout.tsx will catch the no-user_settings state and route
  // them to /onboarding.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: password as string,
  });
  if (signInErr) {
    // Account was created OK but auto-login failed — fall back to
    // manual login. No "check your email" message because there's
    // nothing to check.
    redirect("/login?message=Account%20ready.%20Sign%20in%20below.");
  }

  redirect("/");
}
