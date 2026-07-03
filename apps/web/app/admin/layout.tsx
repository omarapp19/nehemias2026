"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@nehemias/ui";
import {
  IconTrendingUp,
  IconHeart,
  IconReceipt,
  IconBox,
  IconMapPin,
  IconCamera,
  IconShield,
  IconX,
  IconMenu,
} from "@nehemias/ui";
import { BrandMark } from "@/components/brand";
import { apiMe, apiLogout } from "@/lib/admin-api";

const NAV = [
  { href: "/admin", label: "Inicio", icon: IconTrendingUp },
  { href: "/admin/donaciones", label: "Donaciones", icon: IconHeart },
  { href: "/admin/egresos", label: "Egresos", icon: IconReceipt },
  { href: "/admin/inventario", label: "Inventario", icon: IconBox },
  { href: "/admin/galeria", label: "Galería", icon: IconCamera },
  { href: "/admin/captacion", label: "Métodos de pago", icon: IconShield },
  { href: "/admin/auditoria", label: "Auditoría", icon: IconShield },
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Formatted current date
  const [formattedDate, setFormattedDate] = useState("");
  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  if (isLogin) return <>{children}</>;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted bg-surface/30">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <BrandMark size={36} />
          </div>
          <span className="text-sm font-semibold tracking-wider uppercase text-ink-subtle">Cargando panel...</span>
        </div>
      </div>
    );
  }

  async function logout() {
    await apiLogout().catch(() => {});
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar para pantallas grandes */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-gradient-to-b from-[#091e15] to-[#040e0a] border-r border-[#143224] z-30 shadow-xl">
        <div className="flex h-16 items-center px-6 border-b border-[#143224]">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:rotate-12">
              <BrandMark size={28} />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-white group-hover:text-brand-soft transition-colors">
              Nehemías
            </span>
            <span className="text-[10px] bg-brand-soft/20 text-brand-soft px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto custom-scrollbar">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] ${
                  active
                    ? "bg-brand text-brand-contrast shadow-[0_4px_12px_rgba(11,68,45,0.35)]"
                    : "text-emerald-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-brand-contrast" : "text-brand-soft/80"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#143224] bg-black/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{admin?.name}</span>
              <span className="text-xs text-brand-soft/75 truncate">Administrador</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="w-full text-xs h-8 bg-white/10 border-none hover:bg-white/20 text-white font-bold"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="font-serif text-base font-bold text-ink">Panel Nehemías</span>
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink border border-border/40 focus:outline-none cursor-pointer transition-colors"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>

        {/* Menu móvil desplegable */}
        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-[53px] z-50 bg-surface flex flex-col justify-between border-t border-border animate-in slide-in-from-top-4 duration-200">
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-lg text-base font-bold transition-all ${
                      active
                        ? "bg-brand text-brand-contrast shadow-md"
                        : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
                    }`}
                  >
                    <Icon size={20} className={active ? "text-brand-contrast" : "text-brand/80"} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-5 border-t border-border bg-surface-sunken/40 flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-ink truncate">{admin?.name}</span>
                <span className="text-xs text-ink-subtle truncate">Administrador</span>
              </div>
              <button
                onClick={logout}
                className="text-sm font-bold text-danger bg-danger-soft/60 hover:bg-danger-soft px-4 py-2 rounded-lg border border-danger/10 transition-all cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <div className="md:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header para pantallas grandes */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-subtle font-medium">Panel de administración</span>
            <span className="text-ink-subtle/30">/</span>
            <span className="text-sm font-bold text-ink capitalize">
              {pathname === "/admin" ? "Inicio" : pathname.split("/").pop()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-subtle font-medium bg-surface-sunken px-3 py-1 rounded-full border border-border/50">
              {formattedDate}
            </span>
            <div className="h-6 w-[1px] bg-border/80"></div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand text-xs uppercase shadow-inner">
                {admin?.name?.substring(0, 2) || "AD"}
              </div>
              <span className="text-xs font-semibold text-ink-muted">Hola, {admin?.name?.split(" ")[0]}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 md:px-8 md:py-10 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
