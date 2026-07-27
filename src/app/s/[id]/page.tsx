import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import { SharedPlace } from "./_components/SharedPlace";

export const metadata = { title: "A GreatFinds recommendation" };

/** Public, read-only view of a single place. Reads via the service role
 *  so a shared link opens for anyone, even though everyone's own list is
 *  private. */
export default async function SharedPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SharedPlace place={data as Restaurant} isLoggedIn={!!user} />;
}
