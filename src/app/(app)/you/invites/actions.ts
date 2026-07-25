"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

// Email send paused while we're on Resend's free tier — it only
// delivers to the one verified address, so any send to a real
// invitee fails with a misleading error even though the invite row
// is correctly created. The admin now copies the signup link from
// the UI and shares it out-of-band (DM, message). When/if we move
// to a verified domain, re-import sendInviteEmail and add it back
// as a best-effort try/catch.

type Result = {
  success: boolean;
  error?: string;
  /** Signup URL the admin should share with the invitee. Returned on
   *  success so the UI can surface it immediately. */
  signupUrl?: string;
  /** Echoed invite email for the UI's "Invite created for X" line. */
  email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newToken(): string {
  return randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// sendNewInvite — admin creates an invite for an arbitrary email
// ---------------------------------------------------------------------------

export async function sendNewInvite(input: {
  email: string;
  note?: string | null;
}): Promise<Result> {
  await requireAdmin();

  const email = input.email?.trim().toLowerCase();
  const note = input.note?.trim() || null;
  if (!email || !EMAIL_RE.test(email)) {
    return { success: false, error: "Add a valid email to continue." };
  }

  const admin = createAdminClient();

  // Catch a duplicate before the UNIQUE constraint would for a cleaner
  // message.
  const { data: existing } = await admin
    .from("invites")
    .select("id, accepted_at")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return {
      success: false,
      error: existing.accepted_at
        ? "That email already has an account."
        : "That email already has a pending invite.",
    };
  }

  // Who's sending — we know they're admin because requireAdmin passed.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const token = newToken();

  const { error: insertErr } = await admin.from("invites").insert({
    email,
    token,
    invited_by: user.id,
    note,
  });
  if (insertErr) return { success: false, error: insertErr.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signupUrl = `${appUrl}/signup?token=${token}`;

  revalidatePath("/you/invites");
  return { success: true, signupUrl, email };
}

// ---------------------------------------------------------------------------
// revokeInvite — delete the row, token stops working
// ---------------------------------------------------------------------------

export async function revokeInvite(id: string): Promise<Result> {
  await requireAdmin();
  if (!id) return { success: false, error: "Missing id." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("invites")
    .delete()
    .eq("id", id)
    .is("accepted_at", null); // guard — don't nuke accepted invites
  if (error) return { success: false, error: error.message };

  revalidatePath("/you/invites");
  return { success: true };
}

// ---------------------------------------------------------------------------
// approveAccessRequest — creates an invite + sends approved email
// ---------------------------------------------------------------------------

export async function approveAccessRequest(id: string): Promise<Result> {
  await requireAdmin();
  if (!id) return { success: false, error: "Missing id." };

  const admin = createAdminClient();

  const { data: req, error: fetchErr } = await admin
    .from("access_requests")
    .select("id, email, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!req) return { success: false, error: "Request not found." };
  if (req.status !== "pending") {
    return { success: false, error: "Request is no longer pending." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  // If an invite for this email already exists (edge case), reuse its
  // token; otherwise create one.
  let token: string;
  const { data: existingInvite } = await admin
    .from("invites")
    .select("token")
    .eq("email", req.email)
    .maybeSingle();
  if (existingInvite) {
    token = existingInvite.token;
  } else {
    token = newToken();
    const { error: insertErr } = await admin.from("invites").insert({
      email: req.email,
      token,
      invited_by: user.id,
      note: "Approved from request.",
    });
    if (insertErr) return { success: false, error: insertErr.message };
  }

  // Mark request approved.
  const { error: updateErr } = await admin
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id);
  if (updateErr) return { success: false, error: updateErr.message };

  // Email send intentionally skipped (see header comment). Admin
  // copies the signup link from the Pending invites row that's now
  // visible after revalidate.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const signupUrl = `${appUrl}/signup?token=${token}`;

  revalidatePath("/you/invites");
  return { success: true, signupUrl, email: req.email };
}

// ---------------------------------------------------------------------------
// declineAccessRequest — mark declined, no email
// ---------------------------------------------------------------------------

export async function declineAccessRequest(id: string): Promise<Result> {
  await requireAdmin();
  if (!id) return { success: false, error: "Missing id." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("access_requests")
    .update({
      status: "declined",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { success: false, error: error.message };

  revalidatePath("/you/invites");
  return { success: true };
}

// Used by the "Copy invite link" affordance — returns the URL only,
// no email. Useful when the inviter wants to send it via DM / message.
export async function getInviteLink(id: string): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  await requireAdmin();
  if (!id) return { success: false, error: "Missing id." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invites")
    .select("token")
    .eq("id", id)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Invite not found." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { success: true, url: `${appUrl}/signup?token=${data.token}` };
}

/** Server-side helper for the page server component. Returns 404-style
 *  redirect when the user isn't admin. */
export async function ensureAdminOr404(): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    redirect("/you");
  }
}
