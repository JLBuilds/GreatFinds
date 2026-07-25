import Link from "next/link";
import { RequestAccessForm } from "./_components/RequestAccessForm";

export default function RequestAccessPage() {
  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/login"
          className="inline-block font-body text-sm text-fog hover:text-snow"
        >
          ← Back
        </Link>

        <header className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mark.svg"
            alt="GreatFind"
            width={120}
            height={120}
            className="h-14 w-auto mx-auto"
          />
          <h1 className="font-display text-3xl text-snow">
            Request access to <em className="italic">GreatFind</em>
          </h1>
          <p className="font-display text-base text-fog">
            GreatFind is currently invite-only. Tell Jo who you are, and
            she&apos;ll be in touch.
          </p>
        </header>

        <RequestAccessForm />

        <p className="text-center font-body text-sm text-fog">
          Already have an account?{" "}
          <Link href="/login" className="text-snow hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
