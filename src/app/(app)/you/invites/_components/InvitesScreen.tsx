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
        <Link href="/you" className="font-body text-sm text-fog">
          ← You
        </Link>
        <h1 className="font-display text-3xl text-snow pt-2">Invites</h1>
      </div>

      {/* New invite */}
      <section className="rounded-xl bg-card p-4 space-y-3">
        <p className="font-display text-lg text-snow">Invite someone</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="w-full rounded-lg bg-ink px-4 py-2.5 font-body text-sm text-snow placeholder:text-fog/70 focus:outline-none"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-lg bg-ink px-4 py-2.5 font-body text-sm text-snow placeholder:text-fog/70 focus:outline-none"
        />
        {error ? <p className="font-body text-sm text-coral">{error}</p> : null}
        {newLink ? (
          <div className="rounded-lg bg-ink p-3 space-y-1">
            <p className="font-body text-xs text-fog">
              Invite created — share this link:
            </p>
            <p className="font-body text-xs text-snow break-all">{newLink}</p>
          </div>
        ) : null}
        <button
          onClick={invite}
          disabled={busy || !email.trim()}
          className="w-full bg-coral text-ink rounded-lg py-2.5 font-body text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </section>

      {/* Access requests */}
      {openRequests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-snow">Access requests</h2>
          {openRequests.map((r) => (
            <div key={r.id} className="rounded-xl bg-card p-4 space-y-2">
              <p className="font-body text-sm text-snow">{r.email}</p>
              {r.message ? (
                <p className="font-display text-sm text-fog">
                  &ldquo;{r.message}&rdquo;
                </p>
              ) : null}
              <p className="font-body text-xs text-fog/80">
                {fmtDate(r.requestedAt)}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    await approveAccessRequest(r.id);
                    router.refresh();
                  }}
                  className="flex-1 bg-lilac text-ink rounded-lg py-2 font-body text-xs font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={async () => {
                    await declineAccessRequest(r.id);
                    router.refresh();
                  }}
                  className="flex-1 bg-card text-fog rounded-lg py-2 font-body text-xs"
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
          <h2 className="font-display text-xl text-snow">Pending invites</h2>
          {pending.map((i) => (
            <div key={i.id} className="rounded-xl bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-sm text-snow min-w-0 truncate">
                  {i.email}
                </p>
                <p className="font-body text-xs text-fog/80 shrink-0">
                  {fmtDate(i.invitedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                {i.signupUrl ? (
                  <button
                    onClick={() => copy(i.signupUrl!, i.id)}
                    className="flex-1 bg-coral text-ink rounded-lg py-2 font-body text-xs font-medium"
                  >
                    {copiedId === i.id ? "Copied ✓" : "Copy invite link"}
                  </button>
                ) : null}
                <button
                  onClick={async () => {
                    await revokeInvite(i.id);
                    router.refresh();
                  }}
                  className="bg-card text-fog rounded-full px-4 py-2 font-body text-xs"
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
          <h2 className="font-display text-xl text-snow">Joined</h2>
          {accepted.map((i) => (
            <div
              key={i.id}
              className="rounded-lg bg-card/60 px-4 py-3 flex items-center justify-between"
            >
              <p className="font-body text-sm text-snow">{i.email}</p>
              <p className="font-body text-xs text-fog/80">
                {i.acceptedAt ? fmtDate(i.acceptedAt) : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
