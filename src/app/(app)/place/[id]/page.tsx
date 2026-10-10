import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { Folder, Project, Restaurant } from "@/lib/types";
import { PlaceDetail } from "./_components/PlaceDetail";
import { PlaceSync } from "../../_components/PlaceSync";
import { needsSync } from "@/lib/hours";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: restaurant },
    { data: folders },
    userRes,
    admin,
    { data: projects },
    { data: memberRows },
  ] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
    supabase.from("folders").select("id, name").order("name"),
    supabase.auth.getUser(),
    isAdmin(),
    supabase
      .from("projects")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("project_places").select("project_id").eq("restaurant_id", id),
  ]);
  const projectIds = ((memberRows ?? []) as { project_id: string }[]).map(
    (m) => m.project_id,
  );

  if (!restaurant) notFound();

  const r = restaurant as Restaurant;
  // Admins can edit and delete anyone's entry.
  const isOwner = admin || userRes.data.user?.id === r.created_by;

  const stale = Boolean(r.google_place_id) && needsSync(r.google_synced_at);

  return (
    <>
      {stale ? <PlaceSync ids={[r.id]} /> : null}
      <PlaceDetail
        restaurant={r}
        isOwner={isOwner}
        folders={(folders ?? []) as Folder[]}
        projects={(projects ?? []) as Project[]}
        projectIds={projectIds}
      />
    </>
  );
}
