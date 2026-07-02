import Link from "next/link";
import { buttonClasses } from "@nehemias/ui";
import { Logo } from "./brand";

const NAV = [
  { href: "/transparencia", label: "Transparencia" },
  { href: "/necesidades", label: "Necesidades" },
  { href: "/galeria", label: "Galería" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Logo />

        {/* Navegación escritorio */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/admin" className={buttonClasses("secondary", "sm")}>
            Iniciar sesión
          </Link>
          <Link href="/donar" className={buttonClasses("primary", "sm")}>
            Quiero ayudar
          </Link>
        </nav>

        {/* Menú móvil sin JavaScript (disclosure nativo) */}
        <details className="relative md:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-border text-ink [&::-webkit-details-marker]:hidden">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="sr-only">Abrir menú</span>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-ink hover:bg-surface"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className={buttonClasses("secondary", "md", "w-full text-center mt-1")}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/donar"
              className={buttonClasses("primary", "md", "w-full text-center")}
            >
              Quiero ayudar
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
