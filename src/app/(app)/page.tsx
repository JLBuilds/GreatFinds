import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  initials,
  type Folder,
  type Profile,
  type Restaurant,
} from "@/lib/types";
import { PlacesList } from "./_components/PlacesList";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: restaurants }, { data: profiles }, { data: folders }, userRes] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
      // Defensive: pre-migration this table may not exist; error → [].
      supabase.from("folders").select("id, name").order("name"),
      supabase.auth.getUser(),
    ]);

  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as Profile[]) {
    names[p.user_id] = p.display_name;
  }

  const me = userRes.data.user;
  const myName = me ? (names[me.id] ?? me.email ?? "") : "";
  const count = (restaurants ?? []).length;

  const now = new Date();
  const dateLine = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="max-w-sm mx-auto px-6 pt-6">
      <header className="flex items-end justify-between pb-6">
        <div className="flex flex-col gap-[3px]">
          <span className="text-sm font-medium text-fog">{dateLine}</span>
          <h1 className="text-[26px] font-semibold text-white tracking-[-0.01em]">
            Places you&apos;ll love
          </h1>
          <span className="text-sm text-fog">
            {count === 0
              ? "Nothing kept yet."
              : `${count} place${count === 1 ? "" : "s"} kept`}
          </span>
        </div>
        <Link
          href="/you"
          className="w-[42px] h-[42px] rounded-full bg-coral text-ink text-[15px] font-semibold flex items-center justify-center shrink-0"
        >
          {initials(myName)}
        </Link>
      </header>

      <PlacesList
        restaurants={(restaurants ?? []) as Restaurant[]}
        names={names}
        folders={(folders ?? []) as Folder[]}
      />
    </main>
  );
}
