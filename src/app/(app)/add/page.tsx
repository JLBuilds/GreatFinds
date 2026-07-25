import { createClient } from "@/lib/supabase/server";
import type { Folder } from "@/lib/types";
import { AddPlaceScreen } from "./_components/AddPlaceScreen";

export const metadata = { title: "Add a place" };

export default async function AddPage() {
  const supabase = await createClient();
  // Defensive: before migration 0002 runs, this table doesn't exist —
  // treat any error as "no folders" rather than crashing the page.
  const { data } = await supabase
    .from("folders")
    .select("id, name")
    .order("name");

  return <AddPlaceScreen folders={(data ?? []) as Folder[]} />;
}
