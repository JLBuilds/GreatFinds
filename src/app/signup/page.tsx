import Link from "next/link";
import { redirect } from "next/navigation";
import { signupWithInvite, validateInviteToken } from "./actions";

type SearchParams = Promise<{ token?: string; error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    redirect("/request-access");
  }

  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-display text-4xl text-snow">GreatFinds</h1>
          <p className="font-display text-base text-fog">
            {validation.reason === "already_used"
              ? "This invite has already been used."
              : validation.reason === "config_error"
                ? "Signup is briefly unavailable. Try again in a minute — if it still doesn't work, let Jo know."
                : "This invite link doesn't work. It may have been revoked, or the link is invalid."}
          </p>
          <div className="space-y-2">
            <Link
              href="/request-access"
              className="block w-full bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90"
            >
              Request access →
            </Link>
            <Link
              href="/login"
              className="block font-body text-sm text-fog hover:text-mist"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          <h1 className="font-display text-4xl text-snow">
            Welcome to <em className="italic">GreatFinds</em>
          </h1>
          <p className="font-display text-base text-fog">
            You were invited.
          </p>
        </header>

        <form action={signupWithInvite} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block font-body text-xs text-fog tracking-wide uppercase"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={validation.email}
              readOnly
              required
              className="w-full rounded-lg bg-card px-4 py-3 font-display text-base text-mist cursor-not-allowed focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-body text-xs text-fog tracking-wide uppercase"
            >
              Choose a password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg bg-card px-4 py-3 font-display text-base text-snow focus:outline-none focus:bg-card"
            />
            <p className="font-display text-xs text-fog pt-1">
              At least 6 characters.
            </p>
          </div>

          {error && (
            <p className="font-body text-sm text-snow text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90"
          >
            Create account
          </button>
        </form>

        <p className="text-center font-body text-sm text-fog">
          Already signed up?{" "}
          <Link href="/login" className="text-snow hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
