"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RestaurantStatus } from "@/lib/types";

export type RestaurantInput = {
  name: string;
  cuisine?: string | null;
  area?: string | null;
  city?: string | null;
  price_level?: number | null;
  status: RestaurantStatus;
  recommended_by?: string | null;
  notes?: string | null;
  link?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type Result = { success: boolean; error?: string; id?: string };

const STATUSES: RestaurantStatus[] = ["want_to_try", "been", "favorite"];

function clean(input: RestaurantInput): RestaurantInput | { error: string } {
  const name = input.name?.trim();
  if (!name) return { error: "Give the place a name." };
  if (!STATUSES.includes(input.status)) return { error: "Invalid status." };
  const price =
    input.price_level && input.price_level >= 1 && input.price_level <= 4
      ? Math.round(input.price_level)
      : null;
  return {
    name,
    cuisine: input.cuisine?.trim() || null,
    area: input.area?.trim() || null,
    city: input.city?.trim() || null,
    price_level: price,
    status: input.status,
    recommended_by: input.recommended_by?.trim() || null,
    notes: input.notes?.trim() || null,
    link: input.link?.trim() || null,
    google_place_id: input.google_place_id || null,
    google_maps_url: input.google_maps_url || null,
    address: input.address?.trim() || null,
    lat: typeof input.lat === "number" ? input.lat : null,
    lng: typeof input.lng === "number" ? input.lng : null,
  };
}

export async function createRestaurant(input: RestaurantInput): Promise<Result> {
  const cleaned = clean(input);
  if ("error" in cleaned) return { success: false, error: cleaned.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("restaurants")
    .insert({ ...cleaned, created_by: user.id })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/map");
  return { success: true, id: data.id };
}

export async function updateRestaurant(
  id: string,
  input: RestaurantInput,
): Promise<Result> {
  if (!id) return { success: false, error: "Missing id." };
  const cleaned = clean(input);
  if ("error" in cleaned) return { success: false, error: cleaned.error };

  const supabase = await createClient();
  // RLS restricts updates to the author's own rows.
  const { error } = await supabase
    .from("restaurants")
    .update(cleaned)
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath(`/place/${id}`);
  return { success: true, id };
}

export async function setRestaurantStatus(
  id: string,
  status: RestaurantStatus,
): Promise<Result> {
  if (!id || !STATUSES.includes(status)) {
    return { success: false, error: "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ status })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath(`/place/${id}`);
  return { success: true, id };
}

export async function deleteRestaurant(id: string): Promise<never> {
  if (id) {
    const supabase = await createClient();
    // RLS restricts deletes to the author's own rows.
    await supabase.from("restaurants").delete().eq("id", id);
    revalidatePath("/");
    revalidatePath("/map");
  }
  redirect("/");
}
