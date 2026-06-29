import Link from "next/link";
import { BrandMark } from "./brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandMark size={28} />
              <span className="font-serif text-lg font-semibold text-ink">
                Proyecto Nehemías
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Asistimos a las comunidades olvidadas tras los terremotos. Cada aporte se
              registra y se puede auditar: a dónde fue, en qué se usó y a quién llegó.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/transparencia" className="text-ink-muted hover:text-ink">
              Transparencia
            </Link>
            <Link href="/necesidades" className="text-ink-muted hover:text-ink">
              Necesidades
            </Link>
            <Link href="/entregas" className="text-ink-muted hover:text-ink">
              Entregas
            </Link>
            <Link href="/donar" className="text-ink-muted hover:text-ink">
              Quiero ayudar
            </Link>
          </nav>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-ink-subtle">
          Las cifras se calculan automáticamente a partir de aportes verificados. Los datos de
          contacto de donantes y beneficiarios nunca son públicos.
        </p>
      </div>
    </footer>
  );
}
