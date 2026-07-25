"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Icons traced from the Kept design handoff (stroke style, 24×24). */
function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.2 12 4l8 6.2V19a1.6 1.6 0 0 1-1.6 1.6h-3.6v-5.4a1.4 1.4 0 0 0-1.4-1.4h-2.8a1.4 1.4 0 0 0-1.4 1.4v5.4H5.6A1.6 1.6 0 0 1 4 19v-8.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21.5c4.2-4.6 6.3-8.1 6.3-11A6.3 6.3 0 0 0 5.7 10.5c0 2.9 2.1 6.4 6.3 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.2" r="2.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7.6" r="3.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.8 19.4c.9-2.9 3.5-4.4 7.2-4.4s6.3 1.5 7.2 4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS: Array<{
  href: string;
  label: string;
  icon: () => React.ReactNode;
  match: (path: string) => boolean;
}> = [
  {
    href: "/",
    label: "Home",
    icon: HomeIcon,
    match: (p) => p === "/" || p.startsWith("/place"),
  },
  {
    href: "/map",
    label: "Map",
    icon: MapIcon,
    match: (p) => p.startsWith("/map"),
  },
  {
    href: "/add",
    label: "Add",
    icon: PlusIcon,
    match: (p) => p.startsWith("/add"),
  },
  {
    href: "/you",
    label: "You",
    icon: UserIcon,
    match: (p) => p.startsWith("/you"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-ink border-t border-line"
      aria-label="Primary"
    >
      <div className="max-w-sm mx-auto flex items-start px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? "flex-1 flex flex-col items-center gap-[5px] text-coral"
                  : "flex-1 flex flex-col items-center gap-[5px] text-fog"
              }
            >
              <tab.icon />
              <span
                className="text-[11px]"
                style={{ fontWeight: active ? 600 : 500 }}
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
