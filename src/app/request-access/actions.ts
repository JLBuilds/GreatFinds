"use server";

import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { sendAccessRequestNotification } from "@/lib/email";

export type RequestAccessResult =
  | { status: "submitted" }
  | { status: "duplicate"; requestedAt: string }
  | { status: "already_invited" }
  | { status: "declined" }
  | { status: "error"; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitAccessRequest(input: {
  email: string;
  message: string;
}): Promise<RequestAccessResult> {
  if (!isAdminClientConfigured()) {
    console.error(
      "[submitAccessRequest] SUPABASE_SERVICE_ROLE_KEY missing at runtime",
    );
    return {
      status: "error",
      error: "Sign-ups are briefly unavailable. Try again in a minute.",
    };
  }
  const email = input.email?.trim().toLowerCase();
  const message = input.message?.trim();

  if (!email || !EMAIL_RE.test(email)) {
    return { status: "error", error: "Add a valid email to continue." };
  }
  if (!message || message.length < 4) {
    return {
      status: "error",
      error: "Add a short note so we know who you are.",
    };
  }

  const admin = createAdminClient();

  // Already invited (active or used)?
  const { data: existingInvite } = await admin
    .from("invites")
    .select("id, accepted_at")
    .eq("email", email)
    .maybeSingle();
  if (existingInvite) {
    return { status: "already_invited" };
  }

  // Already requested?
  const { data: existingReq } = await admin
    .from("access_requests")
    .select("requested_at, status")
    .eq("email", email)
    .maybeSingle();

  if (existingReq?.status === "pending") {
    return { status: "duplicate", requestedAt: existingReq.requested_at };
  }
  if (existingReq?.status === "declined") {
    // Honest, calm — we don't quietly re-queue them.
    return { status: "declined" };
  }

  // No row, or previous was approved (in which case there'd be an invite,
  // handled above) — insert fresh.
  const { error: insertErr } = await admin
    .from("access_requests")
    .insert({ email, message });
  // UNIQUE(email) — race condition guard, but the maybeSingle above
  // catches the normal case.
  if (insertErr) {
    return { status: "error", error: insertErr.message };
  }

  // Notify admins via email. Best-effort — a Resend failure (e.g. free
  // tier rejecting an unverified recipient) must not roll back the
  // saved request. The admin can also see new requests on /you/invites.
  //
  // Recipient source: prefer ADMIN_NOTIFICATION_TO when set so the
  // notification can target Jo's Resend-verified alias (e.g.
  // jolehndorf+groove@gmail.com) without forcing ADMIN_EMAILS — which
  // also gates the isAdmin() check — to use that same alias. Falls back
  // to ADMIN_EMAILS so single-admin setups keep working unchanged.
  const recipients = (
    process.env.ADMIN_NOTIFICATION_TO ??
    process.env.ADMIN_EMAILS ??
    ""
  )
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length > 0) {
    try {
      await sendAccessRequestNotification({
        to: recipients,
        requesterEmail: email,
        message,
      });
    } catch (err) {
      console.error(
        "[submitAccessRequest] admin notification failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { status: "submitted" };
}
