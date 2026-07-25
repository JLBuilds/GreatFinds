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
  price_range?: string | null;
  status: RestaurantStatus;
  recommended_by?: string | null;
  notes?: string | null;
  link?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  photos?: string[] | null;
  folder_id?: string | null;
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
  const photos = Array.isArray(input.photos)
    ? input.photos.filter((p) => typeof p === "string" && p).slice(0, 8)
    : null;
  return {
    name,
    cuisine: input.cuisine?.trim() || null,
    area: input.area?.trim() || null,
    city: input.city?.trim() || null,
    price_level: price,
    price_range: input.price_range?.trim() || null,
    status: input.status,
    recommended_by: input.recommended_by?.trim() || null,
    notes: input.notes?.trim() || null,
    link: input.link?.trim() || null,
    google_place_id: input.google_place_id || null,
    google_maps_url: input.google_maps_url || null,
    address: input.address?.trim() || null,
    lat: typeof input.lat === "number" ? input.lat : null,
    lng: typeof input.lng === "number" ? input.lng : null,
    photos: photos && photos.length > 0 ? photos : null,
    folder_id: input.folder_id || null,
  };
}

export async function createRestaurant(
  input: RestaurantInput,
): Promise<Result> {
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

/** Save photos + price range fetched client-side from Google Places
 *  (used by the "Fetch photos" backfill on the detail page). */
export async function savePlaceMedia(
  id: string,
  photos: string[],
  priceRange: string | null,
): Promise<Result> {
  if (!id) return { success: false, error: "Missing id." };
  const cleanedPhotos = (photos ?? [])
    .filter((p) => typeof p === "string" && p)
    .slice(0, 8);

  const supabase = await createClient();
  const patch: { photos?: string[]; price_range?: string } = {};
  if (cleanedPhotos.length > 0) patch.photos = cleanedPhotos;
  if (priceRange?.trim()) patch.price_range = priceRange.trim();
  if (Object.keys(patch).length === 0) {
    return { success: false, error: "Google had no photos for this place." };
  }

  const { error } = await supabase
    .from("restaurants")
    .update(patch)
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  revalidatePath(`/place/${id}`);
  return { success: true, id };
}

export async function setRestaurantFolder(
  id: string,
  folderId: string | null,
): Promise<Result> {
  if (!id) return { success: false, error: "Missing id." };
  const supabase = await createClient();
  // RLS restricts updates to the author's own rows.
  const { error } = await supabase
    .from("restaurants")
    .update({ folder_id: folderId })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
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

// ---------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------

export async function createFolder(
  name: string,
): Promise<Result & { folderId?: string }> {
  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: "Give the folder a name." };
  if (trimmed.length > 40) {
    return { success: false, error: "Keep folder names under 40 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("folders")
    .insert({ name: trimmed, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A folder with that name exists." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/add");
  return { success: true, folderId: data.id };
}
