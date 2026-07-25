"use client";

import { useState } from "react";
import { submitAccessRequest, type RequestAccessResult } from "../actions";

type Stage =
  | { kind: "form" }
  | { kind: "result"; result: RequestAccessResult };

export function RequestAccessForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitAccessRequest({ email, message });
    setSubmitting(false);
    setStage({ kind: "result", result });
  }

  if (stage.kind === "result" && stage.result.status === "submitted") {
    return (
      <div className="rounded-xl bg-card p-6 space-y-2 text-center">
        <p className="font-display text-lg text-snow">Request sent.</p>
        <p className="font-display text-sm text-fog">
          We&apos;ll be in touch via email if approved.
        </p>
      </div>
    );
  }

  if (stage.kind === "result" && stage.result.status === "duplicate") {
    const when = new Date(stage.result.requestedAt).toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "short", year: "numeric" },
    );
    return (
      <div className="rounded-xl bg-card p-6 space-y-2 text-center">
        <p className="font-display text-lg text-snow">
          We&apos;ve already got your request.
        </p>
        <p className="font-display text-sm text-fog">
          Sent on {when}. Sit tight.
        </p>
      </div>
    );
  }

  if (stage.kind === "result" && stage.result.status === "already_invited") {
    return (
      <div className="rounded-xl bg-card p-6 space-y-2 text-center">
        <p className="font-display text-lg text-snow">
          Looks like you&apos;ve already got an invite.
        </p>
        <p className="font-display text-sm text-fog">
          Check your email for the invite link.
        </p>
      </div>
    );
  }

  if (stage.kind === "result" && stage.result.status === "declined") {
    return (
      <div className="rounded-xl bg-card p-6 space-y-2 text-center">
        <p className="font-display text-base text-fog">
          Thanks for your earlier note. We can&apos;t take new requests from
          this email right now.
        </p>
      </div>
    );
  }

  const errorText =
    stage.kind === "result" && stage.result.status === "error"
      ? stage.result.error
      : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!submitting) handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <label
          htmlFor="ra-email"
          className="block font-body text-xs text-fog tracking-wide uppercase"
        >
          Email
        </label>
        <input
          id="ra-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg bg-card px-4 py-3 font-display text-base text-snow placeholder:text-fog/50 focus:outline-none focus:bg-card disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ra-message"
          className="block font-body text-xs text-fog tracking-wide uppercase"
        >
          Your note
        </label>
        <textarea
          id="ra-message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How did you hear about GreatFind? What draws you to it?"
          disabled={submitting}
          className="w-full rounded-lg bg-card px-4 py-3 font-body text-sm text-snow placeholder:text-fog/70 focus:outline-none focus:bg-card disabled:opacity-60"
        />
      </div>

      {errorText && (
        <p className="font-body text-sm text-center text-snow">{errorText}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !email.trim() || message.trim().length < 4}
        className="w-full bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
