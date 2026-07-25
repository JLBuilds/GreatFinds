"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFolder, setRestaurantFolder } from "../../../actions";
import type { Folder } from "@/lib/types";

/** Owner-only quick folder assignment on the place detail page.
 *  Tapping a folder moves the place into it immediately. */
export function FolderPicker({
  restaurantId,
  currentFolderId,
  folders,
}: {
  restaurantId: string;
  currentFolderId: string | null;
  folders: Folder[];
}) {
  const router = useRouter();
  const [localFolders, setLocalFolders] = useState<Folder[]>(folders);
  const [selected, setSelected] = useState<string | null>(currentFolderId);
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function move(folderId: string | null) {
    setBusy(true);
    setError(null);
    const prev = selected;
    setSelected(folderId);
    const result = await setRestaurantFolder(restaurantId, folderId);
    setBusy(false);
    if (!result.success) {
      setSelected(prev);
      setError(result.error ?? "Couldn't move.");
      return;
    }
    router.refresh();
  }

  async function addFolder() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const result = await createFolder(newName);
    if (!result.success || !result.folderId) {
      setBusy(false);
      setError(result.error ?? "Couldn't create folder.");
      return;
    }
    const folder = { id: result.folderId, name: newName.trim() };
    setLocalFolders((f) => [...f, folder]);
    setNewName("");
    setNewOpen(false);
    await move(folder.id);
  }

  return (
    <div className="space-y-2">
      <p className="font-body text-xs text-fog tracking-wide uppercase">
        Folder
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => move(null)}
          disabled={busy}
          className={
            selected === null
              ? "rounded-lg bg-lilac text-ink px-3 py-1.5 text-xs font-semibold"
              : "rounded-lg bg-card border border-line text-mist px-3 py-1.5 text-xs"
          }
        >
          None
        </button>
        {localFolders.map((f) => (
          <button
            key={f.id}
            onClick={() => move(f.id)}
            disabled={busy}
            className={
              selected === f.id
                ? "rounded-lg bg-lilac text-ink px-3 py-1.5 text-xs font-semibold"
                : "rounded-lg bg-card border border-line text-mist px-3 py-1.5 text-xs"
            }
          >
            {f.name}
          </button>
        ))}
        <button
          onClick={() => setNewOpen((v) => !v)}
          disabled={busy}
          className="rounded-lg bg-card border border-dashed border-line text-fog px-3 py-1.5 text-xs"
        >
          + New
        </button>
      </div>
      {newOpen ? (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 rounded-lg bg-card border border-line px-3 py-2 text-xs text-snow placeholder:text-fog/70 focus:outline-none"
          />
          <button
            onClick={addFolder}
            disabled={busy || !newName.trim()}
            className="rounded-lg bg-coral text-ink px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {busy ? "…" : "Create"}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-coral">{error}</p> : null}
    </div>
  );
}
