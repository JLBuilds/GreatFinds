import "server-only";
import { Resend } from "resend";

// Lazy-init so build doesn't fail when the env var isn't present in the
// build environment.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY missing. Email send will fail.");
  }
  _resend = new Resend(key);
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function brandedShell(args: {
  heading: string;
  body: string;
  ctaUrl: string;
  ctaLabel: string;
  footnote?: string;
}): string {
  // Inline styles only — most clients strip <style>.
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FBF6EE; color: #23503A;">
      <h1 style="font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 32px; color: #23503A; margin: 0 0 16px;">
        ${args.heading}
      </h1>
      <p style="font-size: 16px; line-height: 1.5; margin: 0 0 16px;">
        ${args.body}
      </p>
      <p style="margin: 24px 0;">
        <a href="${args.ctaUrl}" style="display: inline-block; background: #E05E3D; color: white; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 500;">
          ${args.ctaLabel}
        </a>
      </p>
      ${
        args.footnote
          ? `<p style="font-size: 13px; color: #6b7d72; line-height: 1.4;">${args.footnote}</p>`
          : ""
      }
    </div>
  `;
}

export async function sendInviteEmail(args: {
  to: string;
  token: string;
  inviterName?: string;
  note?: string | null;
}): Promise<void> {
  const inviteUrl = `${APP_URL}/signup?token=${args.token}`;
  const inviter = args.inviterName ?? "Jo";

  const body = `${inviter} has invited you to join GreatFind — a shared map of every restaurant worth remembering.`;
  const noteBlock = args.note
    ? `<p style="font-style: italic; font-size: 14px; color: #6b7d72; margin: 0 0 16px;">&ldquo;${escapeHtml(args.note)}&rdquo;</p>`
    : "";

  const html = brandedShell({
    heading: "You're invited to GreatFind",
    body,
    ctaUrl: inviteUrl,
    ctaLabel: "Accept invite →",
    footnote:
      "This link is unique to you. If you weren't expecting this invite, you can ignore this email.",
  }).replace(
    '<p style="margin: 24px 0;">',
    `${noteBlock}<p style="margin: 24px 0;">`,
  );

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: args.to,
    subject: `${inviter} invited you to GreatFind`,
    html,
  });
  if (error) {
    console.error("[sendInviteEmail] failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendAccessRequestNotification(args: {
  to: string | string[];
  requesterEmail: string;
  message: string;
}): Promise<void> {
  const reviewUrl = `${APP_URL}/you/invites`;

  const html = brandedShell({
    heading: "New GreatFind access request",
    body: `${escapeHtml(args.requesterEmail)} asked to join: &ldquo;${escapeHtml(args.message)}&rdquo;`,
    ctaUrl: reviewUrl,
    ctaLabel: "Review in admin →",
    footnote: "You're getting this because you're listed as a GreatFind admin.",
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: args.to,
    subject: "New GreatFind access request",
    html,
  });
  if (error) {
    console.error("[sendAccessRequestNotification] failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendAccessApprovedEmail(args: {
  to: string;
  token: string;
}): Promise<void> {
  const inviteUrl = `${APP_URL}/signup?token=${args.token}`;
  const html = brandedShell({
    heading: "Your GreatFind access is ready",
    body: "Your request to join GreatFind has been approved. Tap below to set up your account.",
    ctaUrl: inviteUrl,
    ctaLabel: "Set up GreatFind →",
    footnote:
      "This link is unique to you. Save it somewhere safe if you can't sign up right away.",
  });

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: args.to,
    subject: "Your GreatFind access is ready",
    html,
  });
  if (error) {
    console.error("[sendAccessApprovedEmail] failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
