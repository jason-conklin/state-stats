import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Map" },
  { href: "/graph", label: "Graph" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/about", label: "About" },
  { href: "https://github.com", label: "GitHub" },
  { href: "#", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--ss-green-mid)]/40 bg-white/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-[color:var(--ss-green-dark)]">StateStats</span>
        <div className="flex flex-wrap gap-3">
          {footerLinks.map((link) =>
            link.href.startsWith("http") ? (
              <a key={link.href} href={link.href} className="hover:text-[color:var(--ss-green)]">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="hover:text-[color:var(--ss-green)]">
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </footer>
  );
}
