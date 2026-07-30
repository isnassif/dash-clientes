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
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-5 mb-8">
          <Logo size="lg" />
          <div className="text-center">
            <p className="font-mono text-[10px] tracking-widest2 uppercase text-ink-faint mb-2">
              Área do cliente
            </p>
            <h1 className="font-display italic text-3xl leading-none">
              N1 Company
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              Calendário de conteúdo para Instagram
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-5 rounded-2xl bg-surface border border-line p-7 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code"
              className="font-mono text-[10px] tracking-widest2 uppercase text-ink-muted"
            >
              Código de acesso
            </label>
            <input
              id="code"
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-surface-raised border border-line px-4 py-3 text-ink placeholder-ink-faint outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
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
            className="w-full rounded-xl bg-brand-red hover:bg-brand-red/90 disabled:opacity-60 disabled:cursor-not-allowed transition font-semibold py-3 tracking-wide"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center font-mono text-[10px] tracking-widest2 uppercase text-ink-faint mt-6">
          N1 Company · Instagram
        </p>
      </div>
    </main>
  );
}
