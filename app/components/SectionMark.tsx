type MarkKind =
  | "load"
  | "develop"
  | "together"
  | "book"
  | "duty"
  | "race";

const marks: Record<
  MarkKind,
  { label: string; paths: React.ReactNode }
> = {
  load: {
    label: "Ментальная нагрузка",
    paths: (
      <>
        <circle cx="20" cy="18" r="7" />
        <path d="M8 40c2-8 8-12 12-12s10 4 12 12" />
        <path d="M36 14h10M38 20h8M40 26h6" strokeLinecap="round" />
        <circle cx="48" cy="14" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="48" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="48" cy="26" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  develop: {
    label: "Без гонки за развитием",
    paths: (
      <>
        <rect x="10" y="12" width="16" height="22" rx="2" />
        <rect x="30" y="18" width="16" height="16" rx="2" />
        <path d="M14 20h8M14 26h8M34 24h8" strokeLinecap="round" />
        <path d="M22 42c4-6 12-6 16 0" strokeLinecap="round" />
      </>
    ),
  },
  together: {
    label: "15 минут рядом",
    paths: (
      <>
        <circle cx="18" cy="16" r="5" />
        <circle cx="38" cy="16" r="5" />
        <path d="M10 36c1-7 5-10 8-10s7 3 8 10" />
        <path d="M30 36c1-7 5-10 8-10s7 3 8 10" />
        <circle cx="48" cy="30" r="9" />
        <path d="M48 25v6l4 2" strokeLinecap="round" />
      </>
    ),
  },
  book: {
    label: "Готовое решение",
    paths: (
      <>
        <path d="M12 14c6 0 10 2 16 2s10-2 16-2v26c-6 0-10 2-16 2s-10-2-16-2V14z" />
        <path d="M28 16v26" />
        <path d="M16 22h8M16 28h8M32 22h8M32 28h8" strokeLinecap="round" />
      </>
    ),
  },
  duty: {
    label: "Завершённость",
    paths: (
      <>
        <rect x="12" y="10" width="32" height="36" rx="3" />
        <path d="M20 20h16M20 28h16M20 36h10" strokeLinecap="round" />
        <path d="M38 34l3 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  race: {
    label: "Выход из гонки",
    paths: (
      <>
        <path d="M10 38c8-16 14-22 22-22" strokeLinecap="round" />
        <path d="M28 16l4-4 2 5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="34" r="8" />
        <path d="M42 30v5" strokeLinecap="round" />
        <path d="M10 42h36" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },
};

export default function SectionMark({ kind }: { kind: MarkKind }) {
  const mark = marks[kind];

  return (
    <div
      className="section-mark mb-2 flex items-center gap-3 text-accent/70"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 56 48"
        className="h-11 w-12 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        {mark.paths}
      </svg>
      <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">
        {mark.label}
      </span>
    </div>
  );
}
