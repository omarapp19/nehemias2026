"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@nehemias/ui";
import { BrandMark } from "@/components/brand";
import { apiMe, apiLogout } from "@/lib/admin-api";

const NAV = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/donaciones", label: "Donaciones" },
  { href: "/admin/egresos", label: "Egresos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/frentes", label: "Frentes" },
  { href: "/admin/entregas", label: "Entregas" },
  { href: "/admin/captacion", label: "Captación" },
];

interface Admin {
  name: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLogin) {
      setChecking(false);
      return;
    }
    let active = true;
    apiMe()
      .then((res) => {
        if (active) {
          setAdmin(res.admin);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) router.replace("/admin/login");
      });
    return () => {
      active = false;
    };
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        Cargando panel...
      </div>
    );
  }

  async function logout() {
    await apiLogout().catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="font-serif text-base font-semibold text-ink">Panel Nehemías</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">{admin?.name}</span>
            <Button variant="secondary" size="sm" onClick={logout}>
              Salir
            </Button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4">
          <ul className="flex gap-1 pb-2">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-brand-soft text-brand-strong" : "text-ink-muted hover:bg-surface"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
