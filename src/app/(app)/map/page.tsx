import { createClient } from "@/lib/supabase/server";
import type { Project, Restaurant } from "@/lib/types";
import { MapScreen } from "./_components/MapScreen";

export const metadata = { title: "Map" };

export default async function MapPage() {
  const supabase = await createClient();
  const [{ data }, { data: projects }, { data: memberRows }] = await Promise.all([
    supabase
      .from("restaurants")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null),
    supabase
      .from("projects")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("project_places").select("project_id, restaurant_id"),
  ]);
  const membership: Record<string, string[]> = {};
  for (const m of (memberRows ?? []) as { project_id: string; restaurant_id: string }[]) {
    (membership[m.restaurant_id] ??= []).push(m.project_id);
  }

  return (
    <MapScreen
      restaurants={(data ?? []) as Restaurant[]}
      projects={(projects ?? []) as Project[]}
      membership={membership}
    />
  );
}
