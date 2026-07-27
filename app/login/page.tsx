"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Digite o código de acesso.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Código de acesso inválido.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] border border-white/10 p-8 flex flex-col items-center gap-6">
        <Logo size="lg" />
        <div className="text-center">
          <h1 className="text-xl font-bold">N1 Company</h1>
          <p className="text-sm text-white/50 mt-1">
            Calendário de conteúdo Instagram
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm text-white/70">
              Código de acesso
            </label>
            <input
              id="code"
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite seu código"
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-sm text-brand-red font-medium" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-red hover:bg-brand-red/90 disabled:opacity-60 disabled:cursor-not-allowed transition font-bold py-3"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
