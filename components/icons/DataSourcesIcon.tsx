export function DataSourcesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M8 9h8M8 12h8M8 15h5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx="16" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}
