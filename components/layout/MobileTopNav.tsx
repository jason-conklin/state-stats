'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapIcon } from "../icons/MapIcon";
import { GraphIcon } from "../icons/GraphIcon";
import { DataSourcesIcon } from "../icons/DataSourcesIcon";
import { InfoIcon } from "../icons/InfoIcon";

type NavLink = { href: string; label: string };

type Props = {
  navLinks: NavLink[];
};

export function MobileTopNav({ navLinks }: Props) {
  const pathname = usePathname();

  const iconByHref: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    "/": MapIcon,
    "/graph": GraphIcon,
    "/data-sources": DataSourcesIcon,
    "/about": InfoIcon,
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex h-11 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-3 text-slate-50 backdrop-blur-sm sm:hidden">
      <div className="flex items-center gap-3">
        {navLinks.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const IconComp = iconByHref[link.href] ?? MapIcon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-slate-800 hover:text-white ${
                active ? "bg-slate-800 text-white" : ""
              }`}
            >
              <IconComp className="h-5 w-5" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
