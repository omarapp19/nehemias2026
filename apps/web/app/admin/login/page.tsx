"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input, buttonClasses, IconArrowRight } from "@nehemias/ui";
import { BrandMark } from "@/components/brand";
import { apiLogin } from "@/lib/admin-api";

export default function LoginPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await apiLogin(String(data.get("email")), String(data.get("password")));
      router.replace("/admin");
    } catch {
      setError("Correo o contraseña incorrectos.");
      setEstado("idle");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-5">
      <Link
        href="/"
        className={buttonClasses("ghost", "sm", "absolute left-5 top-5 gap-1.5 text-ink-muted hover:text-brand")}
      >
        <IconArrowRight size={16} className="rotate-180" />
        Volver al inicio
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={40} />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">Panel Nehemías</h1>
          <p className="mt-1 text-sm text-ink-muted">Ingresa para administrar la ayuda.</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <Field label="Correo" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" fullWidth disabled={estado === "enviando"}>
            {estado === "enviando" ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
