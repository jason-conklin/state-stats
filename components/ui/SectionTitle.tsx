type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionTitle({ eyebrow, title, description }: Props) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ss-green-dark)]">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-semibold leading-tight text-slate-900">{title}</h1>
      {description ? <p className="text-slate-600">{description}</p> : null}
    </div>
  );
}
