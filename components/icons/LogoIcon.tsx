export function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect x="2" y="6" width="28" height="20" rx="6" fill="#e7f5ec" />
      <path
        d="M7 20h6l3-8 3 6h6"
        fill="none"
        stroke="#1b7f4a"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="12" r="2" fill="#1b7f4a" />
    </svg>
  );
}
