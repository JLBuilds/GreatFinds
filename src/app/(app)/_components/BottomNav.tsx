"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{
  href: string;
  label: string;
  icon: string;
  /** Treat any pathname starting with this prefix as active. */
  match: (path: string) => boolean;
}> = [
  {
    href: "/",
    label: "Places",
    icon: "🍽",
    match: (p) => p === "/" || p.startsWith("/place"),
  },
  {
    href: "/map",
    label: "Map",
    icon: "🗺",
    match: (p) => p.startsWith("/map"),
  },
  {
    href: "/add",
    label: "Add",
    icon: "➕",
    match: (p) => p.startsWith("/add"),
  },
  {
    href: "/you",
    label: "You",
    icon: "👤",
    match: (p) => p.startsWith("/you"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur border-t border-basil/10"
      aria-label="Primary"
    >
      <div className="max-w-sm mx-auto flex justify-around items-center px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-2 py-2 flex-1 min-w-0"
            >
              <span
                className={
                  active
                    ? "text-xl text-tomato leading-none"
                    : "text-xl text-basil/60 leading-none"
                }
                aria-hidden
              >
                {tab.icon}
              </span>
              <span
                className={
                  active
                    ? "font-body text-xs text-tomato"
                    : "font-body text-xs text-basil/70"
                }
                style={{ fontWeight: active ? 500 : 400 }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
