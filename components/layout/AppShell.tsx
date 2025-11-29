'use client';

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useEffect } from "react";
import { MobileTopNav } from "./MobileTopNav";

type NavLink = { href: string; label: string };

type Props = {
  children: ReactNode;
  navLinks: NavLink[];
  statusText: string;
};

export function AppShell({ children, navLinks, statusText }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Emit sidebar toggle events after state commits to avoid cross-render setState warnings.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("statestats:sidebar-toggle", { detail: { collapsed } }));
  }, [collapsed]);

  useEffect(() => {
    const handleTableToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      if (detail?.open) {
        // If data table is opened, collapse the sidebar.
        setCollapsed(true);
      }
    };
    window.addEventListener("statestats:table-toggle", handleTableToggle as EventListener);
    return () => window.removeEventListener("statestats:table-toggle", handleTableToggle as EventListener);
  }, []);

  return (
    <div className="flex h-screen bg-[var(--background)] text-slate-900">
      <MobileTopNav navLinks={navLinks} />
      <Sidebar
        navLinks={navLinks}
        statusText={statusText}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <main className="relative flex-1 overflow-y-auto pt-12 sm:pt-0">
        <div className="h-full w-full">{children}</div>
      </main>
    </div>
  );
}
