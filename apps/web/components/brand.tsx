import Link from "next/link";

/** Emblema: un muro reconstruyéndose (Nehemías reconstruyó el muro de Jerusalén). */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="text-brand"
    >
      <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" opacity="0.1" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="7" y="18" width="8" height="5" />
        <rect x="15" y="18" width="10" height="5" />
        <rect x="9" y="13" width="10" height="5" />
        <rect x="19" y="13" width="6" height="5" />
        <rect x="7" y="8" width="7" height="5" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-lg font-semibold text-ink">Nehemías</span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
          Ayuda con transparencia
        </span>
      </span>
    </Link>
  );
}
