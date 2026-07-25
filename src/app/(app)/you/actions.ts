"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateDisplayName(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name?.trim();
  if (!trimmed) return { success: false, error: "Name can't be empty." };
  if (trimmed.length > 40) {
    return { success: false, error: "Keep it under 40 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, display_name: trimmed });
  if (error) return { success: false, error: error.message };

  revalidatePath("/you");
  revalidatePath("/");
  return { success: true };
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
