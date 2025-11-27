'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

type Props = {
  links: NavLink[];
  lastUpdatedLabel?: string;
};

export function NavBar({ links, lastUpdatedLabel }: Props) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">SS</span>
          <span>StateStats</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 transition ${
                  active ? "bg-slate-900 text-white shadow-sm" : "hover:bg-slate-100"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span>Live data</span>
          </span>
          <span aria-label="Last updated timestamp">Last updated: {lastUpdatedLabel ?? "—"}</span>
        </div>
      </div>
    </header>
  );
}
