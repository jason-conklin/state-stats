'use client';

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useEffect } from "react";

type NavLink = { href: string; label: string };

type Props = {
  children: ReactNode;
  navLinks: NavLink[];
  statusText: string;
};

export function AppShell({ children, navLinks, statusText }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Emit sidebar toggle events after state commits to avoid cross-render setState warnings.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("statestats:sidebar-toggle", { detail: { collapsed } }));
  }, [collapsed]);

  // Allow child components to request opening the mobile nav via a custom event.
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("statestats:open-nav", handler);
    return () => window.removeEventListener("statestats:open-nav", handler);
  }, []);

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
      <Sidebar
        navLinks={navLinks}
        statusText={statusText}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="relative flex-1 overflow-hidden">
        <button
          type="button"
          className="absolute left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          ☰
        </button>
        <div className="h-full w-full overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
