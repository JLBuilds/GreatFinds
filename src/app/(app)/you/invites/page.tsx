import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdminOr404 } from "./actions";
import { InvitesScreen, type AccessRequestRow, type InviteRow } from "./_components/InvitesScreen";

export const metadata = { title: "Invites" };

export default async function InvitesPage() {
  await ensureAdminOr404();

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const [{ data: invites }, { data: requests }] = await Promise.all([
    admin
      .from("invites")
      .select("id, email, token, invited_at, accepted_at, note")
      .order("invited_at", { ascending: false }),
    admin
      .from("access_requests")
      .select("id, email, message, requested_at, status")
      .order("requested_at", { ascending: false }),
  ]);

  const inviteRows: InviteRow[] = (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    invitedAt: i.invited_at,
    acceptedAt: i.accepted_at,
    note: i.note,
    signupUrl: i.accepted_at ? null : `${appUrl}/signup?token=${i.token}`,
  }));

  const requestRows: AccessRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    message: r.message,
    requestedAt: r.requested_at,
    status: r.status,
  }));

  return <InvitesScreen invites={inviteRows} requests={requestRows} />;
}
