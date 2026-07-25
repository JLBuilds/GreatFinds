"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  approveAccessRequest,
  declineAccessRequest,
  revokeInvite,
  sendNewInvite,
} from "../actions";

export type InviteRow = {
  id: string;
  email: string;
  invitedAt: string;
  acceptedAt: string | null;
  note: string | null;
  /** Null once accepted. */
  signupUrl: string | null;
};

export type AccessRequestRow = {
  id: string;
  email: string;
  message: string | null;
  requestedAt: string;
  status: string;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function InvitesScreen({
  invites,
  requests,
}: {
  invites: InviteRow[];
  requests: AccessRequestRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pending = invites.filter((i) => !i.acceptedAt);
  const accepted = invites.filter((i) => i.acceptedAt);
  const openRequests = requests.filter((r) => r.status === "pending");

  async function invite() {
    setBusy(true);
    setError(null);
    setNewLink(null);
    const result = await sendNewInvite({ email, note: note || null });
    setBusy(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setEmail("");
    setNote("");
    setNewLink(result.signupUrl ?? null);
    router.refresh();
  }

  async function copy(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard can fail outside secure contexts — show the URL instead.
      setNewLink(url);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 pt-6 space-y-6">
      <div>
        <Link href="/you" className="font-body text-sm text-basil/60">
          ← You
        </Link>
        <h1 className="font-display text-3xl text-basil pt-2">Invites</h1>
      </div>

      {/* New invite */}
      <section className="rounded-3xl bg-white/70 p-4 space-y-3">
        <p className="font-display text-lg text-basil">Invite someone</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="w-full rounded-2xl bg-cream px-4 py-2.5 font-body text-sm text-basil placeholder:text-basil/40 focus:outline-none"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-2xl bg-cream px-4 py-2.5 font-body text-sm text-basil placeholder:text-basil/40 focus:outline-none"
        />
        {error ? <p className="font-body text-sm text-berry">{error}</p> : null}
        {newLink ? (
          <div className="rounded-2xl bg-cream p-3 space-y-1">
            <p className="font-body text-xs text-basil/70">
              Invite created — share this link:
            </p>
            <p className="font-body text-xs text-basil break-all">{newLink}</p>
          </div>
        ) : null}
        <button
          onClick={invite}
          disabled={busy || !email.trim()}
          className="w-full bg-tomato text-white rounded-full py-2.5 font-body text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </section>

      {/* Access requests */}
      {openRequests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-basil">Access requests</h2>
          {openRequests.map((r) => (
            <div key={r.id} className="rounded-3xl bg-white/70 p-4 space-y-2">
              <p className="font-body text-sm text-basil">{r.email}</p>
              {r.message ? (
                <p className="font-display italic text-sm text-basil/70">
                  &ldquo;{r.message}&rdquo;
                </p>
              ) : null}
              <p className="font-body text-xs text-basil/50">
                {fmtDate(r.requestedAt)}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    await approveAccessRequest(r.id);
                    router.refresh();
                  }}
                  className="flex-1 bg-mint text-white rounded-full py-2 font-body text-xs font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={async () => {
                    await declineAccessRequest(r.id);
                    router.refresh();
                  }}
                  className="flex-1 bg-white text-basil/70 rounded-full py-2 font-body text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Pending invites */}
      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-basil">Pending invites</h2>
          {pending.map((i) => (
            <div key={i.id} className="rounded-3xl bg-white/70 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-sm text-basil min-w-0 truncate">
                  {i.email}
                </p>
                <p className="font-body text-xs text-basil/50 shrink-0">
                  {fmtDate(i.invitedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                {i.signupUrl ? (
                  <button
                    onClick={() => copy(i.signupUrl!, i.id)}
                    className="flex-1 bg-basil text-cream rounded-full py-2 font-body text-xs font-medium"
                  >
                    {copiedId === i.id ? "Copied ✓" : "Copy invite link"}
                  </button>
                ) : null}
                <button
                  onClick={async () => {
                    await revokeInvite(i.id);
                    router.refresh();
                  }}
                  className="bg-white text-basil/60 rounded-full px-4 py-2 font-body text-xs"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Members */}
      {accepted.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl text-basil">Joined</h2>
          {accepted.map((i) => (
            <div
              key={i.id}
              className="rounded-2xl bg-white/50 px-4 py-3 flex items-center justify-between"
            >
              <p className="font-body text-sm text-basil">{i.email}</p>
              <p className="font-body text-xs text-basil/50">
                {i.acceptedAt ? fmtDate(i.acceptedAt) : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
