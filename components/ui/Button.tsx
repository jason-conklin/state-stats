import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ss-green)]";
  const styles = {
    primary: "bg-[color:var(--ss-green)] text-white hover:bg-[color:var(--ss-green-dark)] shadow-sm",
    secondary:
      "border border-[color:var(--ss-green)] bg-white text-[color:var(--ss-green)] hover:bg-[color:var(--ss-green-light)]",
    ghost: "text-[color:var(--ss-green-dark)] hover:bg-[color:var(--ss-green-light)]",
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}
