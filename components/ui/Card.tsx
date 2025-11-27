import { ReactNode } from "react";

type CardProps<T extends keyof React.JSX.IntrinsicElements = "div"> = {
  children: ReactNode;
  className?: string;
  as?: T;
  role?: string;
};

export function Card<T extends keyof React.JSX.IntrinsicElements = "div">({
  children,
  className = "",
  as,
  role,
}: CardProps<T>) {
  const Component = (as ?? "div") as React.ElementType;
  return (
    <Component
      role={role}
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </Component>
  );
}
