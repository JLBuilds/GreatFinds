import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Folder, Restaurant } from "@/lib/types";
import { PlaceDetail } from "./_components/PlaceDetail";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: restaurant }, { data: folders }, userRes] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
    supabase.from("folders").select("id, name").order("name"),
    supabase.auth.getUser(),
  ]);

  if (!restaurant) notFound();

  const r = restaurant as Restaurant;
  const isOwner = userRes.data.user?.id === r.created_by;

  return (
    <PlaceDetail
      restaurant={r}
      isOwner={isOwner}
      folders={(folders ?? []) as Folder[]}
    />
  );
}
