export function GraphIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M4 5v14h16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 15.5 11 11l3 2 5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="15.5" r="1.2" fill="currentColor" />
      <circle cx="11" cy="11" r="1.2" fill="currentColor" />
      <circle cx="14" cy="13" r="1.2" fill="currentColor" />
      <circle cx="19" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}
