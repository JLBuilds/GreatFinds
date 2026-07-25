import { createClient } from "@/lib/supabase/server";
import type { Profile, Restaurant } from "@/lib/types";
import { PlacesList } from "./_components/PlacesList";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: restaurants }, { data: profiles }] = await Promise.all([
    supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("user_id, display_name"),
  ]);

  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as Profile[]) {
    names[p.user_id] = p.display_name;
  }

  return (
    <main className="max-w-sm mx-auto px-4 pt-6">
      <header className="flex items-end justify-between pb-4">
        <div>
          <h1
            className="font-display text-3xl text-basil"
            style={{ fontVariationSettings: '"opsz" 144', fontWeight: 400 }}
          >
            GreatFind
          </h1>
          <p className="font-display italic text-sm text-basil/60">
            {(restaurants ?? []).length === 0
              ? "No places saved yet."
              : `${(restaurants ?? []).length} places worth remembering.`}
          </p>
        </div>
      </header>

      <PlacesList
        restaurants={(restaurants ?? []) as Restaurant[]}
        names={names}
      />
    </main>
  );
}
