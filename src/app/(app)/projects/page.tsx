import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { ProjectsScreen } from "./_components/ProjectsScreen";

export const metadata = { title: "Projects" };

type Row = Project & { project_places: { count: number }[] };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data }, userRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, project_places(count)")
      .order("start_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const rows = (data ?? []) as Row[];
  const projects = rows.map((r) => ({
    ...r,
    count: r.project_places?.[0]?.count ?? 0,
  }));

  return (
    <ProjectsScreen
      projects={projects}
      meId={userRes.data.user?.id ?? null}
    />
  );
}
