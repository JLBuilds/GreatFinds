"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewProjectForm } from "../../_components/ProjectPicker";
import { projectSubtitle, type Project } from "@/lib/types";

type ProjectRow = Project & { count: number };

export function ProjectsScreen({
  projects,
  meId,
}: {
  projects: ProjectRow[];
  meId: string | null;
}) {
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(projects.length === 0);

  return (
    <main className="max-w-sm mx-auto px-6 pt-6 space-y-5">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-[3px]">
          <h1 className="text-[26px] font-semibold text-white tracking-[-0.01em]">
            Projects
          </h1>
          <span className="text-sm text-fog">
            {projects.length === 0
              ? "Plan a trip or an occasion."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </span>
        </div>
        {!newOpen ? (
          <button
            onClick={() => setNewOpen(true)}
            aria-label="New project"
            className="w-[42px] h-[42px] rounded-lg bg-coral text-ink flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(234,124,105,0.4)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </header>

      {newOpen ? (
        <NewProjectForm
          onCancel={projects.length > 0 ? () => setNewOpen(false) : undefined}
          onCreated={(p) => {
            setNewOpen(false);
            router.push(`/projects/${p.id}`);
            router.refresh();
          }}
        />
      ) : null}

      {projects.length === 0 && !newOpen ? (
        <div className="rounded-xl bg-card border border-line p-8 text-center space-y-2">
          <p className="text-[17px] font-semibold text-white">No projects yet</p>
          <p className="text-sm text-fog">
            Group places for a trip, a weekend, or a visitor.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {projects.map((p) => {
          const sub = projectSubtitle(p);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-3 rounded-xl bg-card border border-line p-4 hover:border-coral/60"
            >
              <span className="w-10 h-10 rounded-lg bg-lilac/20 text-lilac flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.2l1.8 2h6A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-white truncate">
                  {p.name}
                </span>
                <span className="block text-xs text-fog truncate">
                  {[sub, `${p.count} place${p.count === 1 ? "" : "s"}`]
                    .filter(Boolean)
                    .join(" · ")}
                  {meId && p.created_by && p.created_by !== meId ? " · shared" : ""}
                </span>
              </span>
              <span className="text-fog">›</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
