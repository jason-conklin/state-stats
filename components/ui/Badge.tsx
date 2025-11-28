type Props = {
  children: React.ReactNode;
  variant?: "default" | "success" | "info";
};

export function Badge({ children, variant = "default" }: Props) {
  const styles: Record<typeof variant, string> = {
    default: "bg-[color:var(--ss-green-light)] text-[color:var(--ss-green-dark)]",
    success: "bg-[color:var(--ss-green)]/10 text-[color:var(--ss-green-dark)]",
    info: "bg-[color:var(--ss-green-mid)]/20 text-[color:var(--ss-green-dark)]",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>{children}</span>;
}
