'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  lastUpdatedLabel?: string;
  statusText?: string;
};

export function NavBar({ links, lastUpdatedLabel, statusText }: Props) {
  const pathname = usePathname();

  return (
    <header className="border-b border-[color:var(--ss-green-dark)] bg-[color:var(--ss-green)] text-white shadow-sm">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-[color:var(--ss-green)] focus:shadow"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Image
            src="/statestats_logo.png"
            alt="StateStats logo"
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg shadow-sm"
            priority
          />
          <span className="text-white">StateStats</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/90" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 transition ${
                  active
                    ? "bg-white text-[color:var(--ss-green)] shadow-sm"
                    : "hover:bg-[color:var(--ss-green-dark)] hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-[color:var(--ss-green-dark)] bg-[color:var(--ss-green-light)] text-[color:var(--ss-green-dark)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--ss-green-mid)]" aria-hidden />
            <span className="font-semibold">
              {statusText ??
                `Live data auto-ingestion: Active — last updated: ${lastUpdatedLabel ?? "—"}`}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
