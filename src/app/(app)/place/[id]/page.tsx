import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Folder, Profile, Restaurant } from "@/lib/types";
import { PlaceDetail } from "./_components/PlaceDetail";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: restaurant }, { data: profiles }, { data: folders }, userRes] =
    await Promise.all([
      supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
      supabase.from("profiles").select("user_id, display_name"),
      supabase.from("folders").select("id, name").order("name"),
      supabase.auth.getUser(),
    ]);

  if (!restaurant) notFound();

  const r = restaurant as Restaurant;
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as Profile[]) {
    names[p.user_id] = p.display_name;
  }

  const isOwner = userRes.data.user?.id === r.created_by;

  return (
    <PlaceDetail
      restaurant={r}
      addedBy={r.created_by ? (names[r.created_by] ?? null) : null}
      isOwner={isOwner}
      folders={(folders ?? []) as Folder[]}
    />
  );
}
