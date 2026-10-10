"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Result = { success: boolean; error?: string };

export type ProjectInput = {
  name: string;
  city?: string | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanProject(input: ProjectInput): ProjectInput | { error: string } {
  const name = input.name?.trim();
  if (!name) return { error: "Give the project a name." };
  if (name.length > 60) return { error: "Keep project names under 60 characters." };
  const city = input.city?.trim() || null;
  const start = input.start_date?.trim() || null;
  const end = input.end_date?.trim() || null;
  if (start && !DATE_RE.test(start)) return { error: "Start date looks wrong." };
  if (end && !DATE_RE.test(end)) return { error: "End date looks wrong." };
  if (start && end && end < start) return { error: "End date is before the start." };
  return { name, city, start_date: start, end_date: end };
}

function revalidateAll(projectId?: string) {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createProject(
  input: ProjectInput,
): Promise<Result & { projectId?: string }> {
  const cleaned = cleanProject(input);
  if ("error" in cleaned) return { success: false, error: cleaned.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...cleaned, created_by: user.id })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  revalidateAll(data.id);
  return { success: true, projectId: data.id };
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<Result> {
  if (!id) return { success: false, error: "Missing id." };
  const cleaned = cleanProject(input);
  if ("error" in cleaned) return { success: false, error: cleaned.error };

  const supabase = await createClient();
  // RLS: only the creator can edit.
  const { error, count } = await supabase
    .from("projects")
    .update(cleaned, { count: "exact" })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  if (!count) return { success: false, error: "Only the creator can edit this project." };

  revalidateAll(id);
  return { success: true };
}

export async function deleteProject(id: string): Promise<never> {
  if (id) {
    const supabase = await createClient();
    // RLS: only the creator can delete; membership rows cascade.
    await supabase.from("projects").delete().eq("id", id);
    revalidateAll();
  }
  redirect("/projects");
}

/** Add places to a project (ignores ones already in it). */
export async function addPlacesToProject(
  projectId: string,
  restaurantIds: string[],
): Promise<Result & { added?: number }> {
  const ids = (restaurantIds ?? []).filter((x) => typeof x === "string" && x);
  if (!projectId || ids.length === 0) {
    return { success: false, error: "Nothing to add." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const rows = ids.map((restaurant_id) => ({
    project_id: projectId,
    restaurant_id,
    added_by: user.id,
  }));
  const { error } = await supabase
    .from("project_places")
    .upsert(rows, { onConflict: "project_id,restaurant_id", ignoreDuplicates: true });
  if (error) return { success: false, error: error.message };

  revalidateAll(projectId);
  for (const id of ids) revalidatePath(`/place/${id}`);
  return { success: true, added: ids.length };
}

export async function removePlaceFromProject(
  projectId: string,
  restaurantId: string,
): Promise<Result> {
  if (!projectId || !restaurantId) return { success: false, error: "Missing id." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_places")
    .delete()
    .eq("project_id", projectId)
    .eq("restaurant_id", restaurantId);
  if (error) return { success: false, error: error.message };

  revalidateAll(projectId);
  revalidatePath(`/place/${restaurantId}`);
  return { success: true };
}

/** Make a place's project membership exactly `projectIds`. Used by the Add
 *  form and the place page's picker. */
export async function setPlaceProjects(
  restaurantId: string,
  projectIds: string[],
): Promise<Result> {
  if (!restaurantId) return { success: false, error: "Missing id." };
  const want = new Set((projectIds ?? []).filter((x) => typeof x === "string" && x));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data: current, error: readErr } = await supabase
    .from("project_places")
    .select("project_id")
    .eq("restaurant_id", restaurantId);
  if (readErr) return { success: false, error: readErr.message };
  const have = new Set((current ?? []).map((r) => r.project_id as string));

  const toAdd = [...want].filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from("project_places").insert(
      toAdd.map((project_id) => ({ project_id, restaurant_id: restaurantId, added_by: user.id })),
    );
    if (error) return { success: false, error: error.message };
  }
  if (toRemove.length) {
    const { error } = await supabase
      .from("project_places")
      .delete()
      .eq("restaurant_id", restaurantId)
      .in("project_id", toRemove);
    if (error) return { success: false, error: error.message };
  }

  revalidateAll();
  for (const id of [...toAdd, ...toRemove]) revalidatePath(`/projects/${id}`);
  revalidatePath(`/place/${restaurantId}`);
  return { success: true };
}
