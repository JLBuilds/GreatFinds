"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, updateDisplayName } from "../actions";

export function ProfileCard({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const result = await updateDisplayName(name);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl bg-card p-4 space-y-4">
      <div className="space-y-1">
        <p className="font-body text-xs text-fog tracking-wide uppercase">
          Signed in as
        </p>
        <p className="font-body text-sm text-snow">{email}</p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="display-name"
          className="block font-body text-xs text-fog tracking-wide uppercase"
        >
          Your name
        </label>
        <div className="flex gap-2">
          <input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg bg-ink px-4 py-2.5 font-body text-sm text-snow focus:outline-none"
          />
          <button
            onClick={save}
            disabled={saving || !name.trim() || name === displayName}
            className="rounded-full bg-coral text-ink px-4 py-2 font-body text-xs font-medium disabled:opacity-40"
          >
            {saved ? "Saved ✓" : saving ? "…" : "Save"}
          </button>
        </div>
        <p className="font-display text-xs text-fog/80 pt-1">
          Shown next to places you add.
        </p>
      </div>

      <button
        onClick={() => signOut()}
        className="w-full rounded-full bg-ink text-fog py-2.5 font-body text-sm hover:text-snow"
      >
        Sign out
      </button>
    </div>
  );
}
