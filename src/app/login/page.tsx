import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mark.svg"
            alt="GreatFind"
            width={120}
            height={120}
            className="h-14 w-auto mx-auto"
          />
          <h1
            className="font-display text-4xl text-snow"
            style={{ fontVariationSettings: '"opsz" 144', fontWeight: 400 }}
          >
            GreatFind
          </h1>
          <p className="font-display text-sm text-fog">
            Every recommendation, remembered.
          </p>
        </header>

        <form className="space-y-4">
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
              required
              className="w-full rounded-lg bg-card px-4 py-3 font-display text-base text-snow focus:outline-none focus:bg-card"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-body text-xs text-fog tracking-wide uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg bg-card px-4 py-3 font-display text-base text-snow focus:outline-none focus:bg-card"
            />
          </div>

          {error ? (
            <p className="font-body text-sm text-snow">{error}</p>
          ) : null}
          {message ? (
            <p className="font-display text-sm text-fog">
              {message}
            </p>
          ) : null}

          <button
            formAction={login}
            className="w-full bg-coral text-ink rounded-lg py-3 font-body font-medium hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <div className="text-center space-y-1 pt-2">
          <p className="font-body text-sm text-fog">
            Have an invite link?{" "}
            <span className="text-fog italic">
              Open it from your email.
            </span>
          </p>
          <Link
            href="/request-access"
            className="inline-block font-body text-sm text-snow hover:opacity-80"
          >
            Don&apos;t have an invite? Request access →
          </Link>
        </div>
      </div>
    </main>
  );
}
