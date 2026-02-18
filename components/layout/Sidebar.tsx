'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { MapIcon } from "../icons/MapIcon";
import { GraphIcon } from "../icons/GraphIcon";
import { DataSourcesIcon } from "../icons/DataSourcesIcon";
import { InfoIcon } from "../icons/InfoIcon";

type NavLink = { href: string; label: string };

type Props = {
  navLinks: NavLink[];
  statusText: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function Sidebar({ navLinks, statusText, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const iconByHref: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    "/": MapIcon,
    "/graph": GraphIcon,
    "/data-sources": DataSourcesIcon,
    "/about": InfoIcon,
  };

  const content = (
    <aside
      className={`relative flex h-full flex-col border-r border-blue-900 bg-blue-950 shadow-sm transition-all duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Floating toggle tab */}
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`absolute top-5 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-blue-700 bg-blue-900 text-blue-100 shadow-md transition-transform duration-200 hover:bg-blue-800 hover:text-white cursor-pointer ${
          collapsed ? "right-[-16px]" : "right-[-12px]"
        }`}
        onClick={onToggleCollapse}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={`flex h-full flex-col ${collapsed ? "items-center pt-4" : "items-stretch pt-4"}`}>
        {/* Logo row */}
        {collapsed ? (
          <button
            type="button"
            aria-label="StateStats home"
            onClick={() => router.push("/")}
            className="mb-4 flex h-10 w-14 items-center justify-center rounded-2xl bg-[color:var(--ss-green-light)] cursor-pointer"
          >
            <Image
              src="/statestats_logo.png"
              alt="StateStats logo"
              width={48}
              height={48}
              className="h-14 w-14"
              priority
            />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 pb-4">
            <button
              type="button"
              aria-label="StateStats home"
              onClick={() => router.push("/")}
              className="flex h-12 w-14 items-center justify-center rounded-2xl bg-[color:var(--ss-green-light)] cursor-pointer"
            >
              <Image
                src="/statestats_logo.png"
                alt="StateStats logo"
                width={36}
                height={36}
                className="h-14 w-14"
                priority
              />
            </button>
            <span className="text-xl font-semibold text-white">StateStats</span>
          </div>
        )}

        {/* Nav list */}
        <nav className={`${collapsed ? "mt-2 flex-1" : "flex-1 px-2 py-2"} text-sm font-medium text-blue-100`}>
          <ul className={collapsed ? "flex flex-col items-center gap-2" : "space-y-1"}>
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const IconComp = iconByHref[link.href] ?? MapIcon;
              if (collapsed) {
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                        active
                          ? "bg-blue-800 text-white"
                          : "text-blue-200 hover:bg-blue-900 hover:text-white"
                      }`}
                      aria-current={active ? "page" : undefined}
                      title={link.label}
                    >
                      <IconComp
                        className={`h-9 w-9 ${
                          active
                            ? "text-white"
                            : "text-blue-200 group-hover:text-white"
                        }`}
                      />
                    </Link>
                  </li>
                );
              }
              return (
                <li key={link.href}>
                  <Link
                  href={link.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-3 transition ${
                    active
                      ? "bg-blue-800 text-white"
                      : "text-blue-100 hover:bg-blue-900 hover:text-white"
                  } justify-start`}
                  aria-current={active ? "page" : undefined}
                >
                  <IconComp
                    className={`h-9 w-9 ${
                      active ? "text-white" : "text-blue-200 group-hover:text-white"
                    }`}
                  />
                  <span className="truncate text-base">{link.label}</span>
                </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Live data badge */}
        <div className={`${collapsed ? "mb-4 mt-auto" : "px-3 pb-4"}`}>
          <div className="rounded-lg border border-blue-700 bg-blue-900/70 px-3 py-2 text-xs text-white shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[color:var(--ss-green)]" aria-hidden />
              {!collapsed && <span className="font-semibold">Live data</span>}
            </div>
            {!collapsed && <p className="mt-1 leading-snug">{statusText}</p>}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="relative hidden h-full md:block">{content}</div>
    </>
  );
}
