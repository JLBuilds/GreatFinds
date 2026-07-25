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
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-display text-4xl text-basil">GreatFind</h1>
          <p className="font-display italic text-base text-basil/70">
            {validation.reason === "already_used"
              ? "This invite has already been used."
              : validation.reason === "config_error"
                ? "Signup is briefly unavailable. Try again in a minute — if it still doesn't work, let Jo know."
                : "This invite link doesn't work. It may have been revoked, or the link is invalid."}
          </p>
          <div className="space-y-2">
            <Link
              href="/request-access"
              className="block w-full bg-tomato text-white rounded-full py-3 font-body font-medium hover:opacity-90"
            >
              Request access →
            </Link>
            <Link
              href="/login"
              className="block font-body text-sm text-basil/60 hover:text-basil/80"
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          <h1 className="font-display text-4xl text-basil">
            Welcome to <em className="italic">GreatFind</em>
          </h1>
          <p className="font-display italic text-base text-basil/70">
            You were invited.
          </p>
        </header>

        <form action={signupWithInvite} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block font-body text-xs text-basil/70 tracking-wide uppercase"
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
              className="w-full rounded-2xl bg-white/70 px-4 py-3 font-display text-base text-basil/80 cursor-not-allowed focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-body text-xs text-basil/70 tracking-wide uppercase"
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
              className="w-full rounded-2xl bg-white/70 px-4 py-3 font-display text-base text-basil focus:outline-none focus:bg-white"
            />
            <p className="font-display italic text-xs text-basil/60 pt-1">
              At least 6 characters.
            </p>
          </div>

          {error && (
            <p className="font-body text-sm text-basil text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-tomato text-white rounded-full py-3 font-body font-medium hover:opacity-90"
          >
            Create account
          </button>
        </form>

        <p className="text-center font-body text-sm text-basil/60">
          Already signed up?{" "}
          <Link href="/login" className="text-basil hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
