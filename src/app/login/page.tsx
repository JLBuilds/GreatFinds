import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
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
            className="font-display text-4xl text-basil"
            style={{ fontVariationSettings: '"opsz" 144', fontWeight: 400 }}
          >
            GreatFind
          </h1>
          <p className="font-display italic text-sm text-basil/70">
            Every recommendation, remembered.
          </p>
        </header>

        <form className="space-y-4">
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
              required
              className="w-full rounded-2xl bg-white/70 px-4 py-3 font-display text-base text-basil focus:outline-none focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-body text-xs text-basil/70 tracking-wide uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-2xl bg-white/70 px-4 py-3 font-display text-base text-basil focus:outline-none focus:bg-white"
            />
          </div>

          {error ? (
            <p className="font-body text-sm text-basil">{error}</p>
          ) : null}
          {message ? (
            <p className="font-display italic text-sm text-basil/70">
              {message}
            </p>
          ) : null}

          <button
            formAction={login}
            className="w-full bg-tomato text-white rounded-full py-3 font-body font-medium hover:opacity-90"
          >
            Sign in
          </button>
        </form>

        <div className="text-center space-y-1 pt-2">
          <p className="font-body text-sm text-basil/70">
            Have an invite link?{" "}
            <span className="text-basil/60 italic">
              Open it from your email.
            </span>
          </p>
          <Link
            href="/request-access"
            className="inline-block font-body text-sm text-basil hover:opacity-80"
          >
            Don&apos;t have an invite? Request access →
          </Link>
        </div>
      </div>
    </main>
  );
}
