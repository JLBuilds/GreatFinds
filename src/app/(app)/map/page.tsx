import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";
import { MapScreen } from "./_components/MapScreen";

export const metadata = { title: "Map" };

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .not("lat", "is", null)
    .not("lng", "is", null);

  return <MapScreen restaurants={(data ?? []) as Restaurant[]} />;
}
