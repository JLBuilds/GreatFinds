"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingType, RestaurantStatus } from "@/lib/types";

export type RestaurantInput = {
  type: ListingType;
  name: string;
  cuisine?: string | null;
  area?: string | null;
  city?: string | null;
  country?: string | null;
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
  const type: ListingType =
    input.type === "experience" ? "experience" : "restaurant";
  const price =
    input.price_level && input.price_level >= 1 && input.price_level <= 4
      ? Math.round(input.price_level)
      : null;
  const photos = Array.isArray(input.photos)
    ? input.photos.filter((p) => typeof p === "string" && p).slice(0, 8)
    : null;
  return {
    type,
    name,
    cuisine: input.cuisine?.trim() || null,
    area: input.area?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
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

/** Copy a shared place (read via service role) into the current user's
 *  own list. Used by the public /s/[id] share page. */
export async function savePlaceToMyList(
  sourceId: string,
): Promise<Result> {
  if (!sourceId) return { success: false, error: "Missing place." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sign in to save this." };

  const admin = createAdminClient();
  const { data: src, error: readErr } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (readErr || !src) return { success: false, error: "Place not found." };

  // Skip if the user already has this exact place saved.
  if (src.google_place_id) {
    const { data: dupe } = await supabase
      .from("restaurants")
      .select("id")
      .eq("google_place_id", src.google_place_id)
      .maybeSingle();
    if (dupe) return { success: true, id: dupe.id };
  }

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      created_by: user.id,
      type: src.type ?? "restaurant",
      name: src.name,
      cuisine: src.cuisine,
      area: src.area,
      city: src.city,
      country: src.country,
      price_level: src.price_level,
      price_range: src.price_range,
      status: "want_to_try",
      recommended_by: src.recommended_by,
      notes: src.notes,
      link: src.link,
      google_place_id: src.google_place_id,
      google_maps_url: src.google_maps_url,
      address: src.address,
      lat: src.lat,
      lng: src.lng,
      photos: src.photos,
      folder_id: null,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true, id: data.id };
}

/** Expand and parse a pasted Google Maps link into a place name +
 *  coordinates, so the Add screen can resolve it without a manual search.
 *  Handles short share links (maps.app.goo.gl) by following the redirect. */
export async function expandMapsUrl(url: string): Promise<{
  ok: boolean;
  name?: string;
  lat?: number;
  lng?: number;
  error?: string;
}> {
  const raw = url?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return { ok: false, error: "Paste a full Google Maps link." };
  }
  try {
    let finalUrl = raw;
    // Expand short links (Google Maps app "Share" gives maps.app.goo.gl).
    if (/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(raw)) {
      const res = await fetch(raw, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GreatFinds/1.0)" },
      });
      finalUrl = res.url || raw;
    }

    let name: string | undefined;
    const placeMatch = finalUrl.match(/\/place\/([^/@?]+)/);
    if (placeMatch) {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
    }

    let lat: number | undefined;
    let lng: number | undefined;
    const at = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) {
      lat = parseFloat(at[1]);
      lng = parseFloat(at[2]);
    } else {
      const q = finalUrl.match(/[?&](?:q|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (q) {
        lat = parseFloat(q[1]);
        lng = parseFloat(q[2]);
      }
    }

    if (!name && lat == null) {
      return {
        ok: false,
        error: "Couldn't read that link — use the full Google Maps URL.",
      };
    }
    return { ok: true, name, lat, lng };
  } catch {
    return { ok: false, error: "Couldn't open that link. Try again." };
  }
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
