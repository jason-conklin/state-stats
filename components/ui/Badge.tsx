type Props = {
  children: React.ReactNode;
  variant?: "default" | "success" | "info";
};

export function Badge({ children, variant = "default" }: Props) {
  const styles: Record<typeof variant, string> = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    info: "bg-blue-50 text-blue-700",
  };
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>{children}</span>;
}
