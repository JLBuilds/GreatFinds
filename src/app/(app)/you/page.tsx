import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ProfileCard } from "./_components/ProfileCard";

export const metadata = { title: "You" };

export default async function YouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();

  const admin = await isAdmin();

  return (
    <main className="max-w-sm mx-auto px-4 pt-6 space-y-5">
      <h1 className="font-display text-3xl text-snow">You</h1>

      <ProfileCard
        email={user?.email ?? ""}
        displayName={profile?.display_name ?? ""}
      />

      {admin ? (
        <Link
          href="/you/invites"
          className="block rounded-xl bg-card p-4 hover:bg-card/80 transition-colors"
        >
          <p className="font-display text-lg text-snow">Invites</p>
          <p className="font-body text-xs text-fog">
            Invite friends & family, review access requests.
          </p>
        </Link>
      ) : null}
    </main>
  );
}
