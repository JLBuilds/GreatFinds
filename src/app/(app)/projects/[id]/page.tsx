import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, Restaurant } from "@/lib/types";
import { ProjectDetail } from "./_components/ProjectDetail";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: members }, userRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("project_places")
      .select("restaurant_id, added_at, restaurants(*)")
      .eq("project_id", id)
      .order("added_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (!project) notFound();

  const places = ((members ?? []) as unknown as { restaurants: Restaurant | null }[])
    .map((m) => m.restaurants)
    .filter((r): r is Restaurant => Boolean(r))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const p = project as Project;
  const isOwner = userRes.data.user?.id === p.created_by;

  return <ProjectDetail project={p} places={places} isOwner={isOwner} />;
}
