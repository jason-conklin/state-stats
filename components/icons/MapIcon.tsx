export function MapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M4 6.5 9 4l6 2.5 5-2.5v13l-5 2.5-6-2.5-5 2.5v-13Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 4v13" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M15 6.5v13" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
