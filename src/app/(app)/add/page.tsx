import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Folder, Project } from "@/lib/types";
import { AddPlaceScreen } from "./_components/AddPlaceScreen";

export const metadata = { title: "Add a place" };

export default async function AddPage() {
  const supabase = await createClient();
  // Defensive: before migration 0002 runs, this table doesn't exist —
  // treat any error as "no folders" rather than crashing the page.
  const [{ data }, { data: projects }] = await Promise.all([
    supabase.from("folders").select("id, name").order("name"),
    supabase
      .from("projects")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Suspense fallback={null}>
      <AddPlaceScreen
        folders={(data ?? []) as Folder[]}
        projects={(projects ?? []) as Project[]}
      />
    </Suspense>
  );
}
