'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

type Props = {
  navLinks: NavLink[];
  statusText: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function Sidebar({ navLinks, statusText, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();

  const content = (
    <aside
      className={`flex h-full flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2">
          <Image
            src="/statestats_logo.png"
            alt="StateStats logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg shadow"
            priority
          />
          {!collapsed && <span className="text-lg font-semibold text-slate-900">StateStats</span>}
        </div>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          onClick={onToggleCollapse}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 text-sm font-medium text-slate-700">
        <ul className="space-y-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                    active
                      ? "bg-[color:var(--ss-green-light)] text-[color:var(--ss-green-dark)]"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={onCloseMobile}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-lg">•</span>
                  {!collapsed && <span>{link.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-lg border border-[color:var(--ss-green-mid)]/40 bg-[color:var(--ss-green-light)] px-3 py-2 text-xs text-[color:var(--ss-green-dark)] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--ss-green-mid)]" aria-hidden />
            {!collapsed && <span className="font-semibold">Live data</span>}
          </div>
          {!collapsed && <p className="mt-1 leading-snug">{statusText}</p>}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="relative hidden h-full md:block">{content}</div>
      <div
        className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onCloseMobile}
        />
        <div
          className={`absolute left-0 top-0 h-full ${mobileOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-200`}
        >
          {content}
        </div>
      </div>
    </>
  );
}
