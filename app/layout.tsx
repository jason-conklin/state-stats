import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const navLinks = [
  { href: "/", label: "Map" },
  { href: "/graph", label: "Graph" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/about", label: "About" },
];

export const metadata: Metadata = {
  title: "StateStats",
  description: "Explore U.S. state-level metrics with maps, charts, and data downloads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900 antialiased`}>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="text-lg font-semibold tracking-tight text-slate-900">StateStats</div>
              <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-md px-2 py-1 transition hover:bg-slate-100">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
