"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import PostCard from "@/components/PostCard";
import PostModal, { PostModalSaveInput } from "@/components/PostModal";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  getMonthGrid,
  isSameDay,
  toISODate,
} from "@/lib/dateUtils";
import type { Client, Post } from "@/types";

export default function CalendarApp({
  role,
  clients,
  initialClientId,
  clientName,
}: {
  role: "admin" | "client";
  clients: Client[];
  initialClientId: string | null;
  clientName: string | null;
}) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalPost, setModalPost] = useState<Post | null>(null);

  const grid = useMemo(
    () => getMonthGrid(cursor.year, cursor.month),
    [cursor]
  );

  const loadPosts = useCallback(async () => {
    if (!clientId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        clientId,
        month: String(cursor.month),
        year: String(cursor.year),
      });
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar posts.");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar posts.");
    } finally {
      setLoading(false);
    }
  }, [clientId, cursor]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  function goPrevMonth() {
    setCursor((c) =>
      c.month === 1
        ? { year: c.year - 1, month: 12 }
        : { year: c.year, month: c.month - 1 }
    );
  }
  function goNextMonth() {
    setCursor((c) =>
      c.month === 12
        ? { year: c.year + 1, month: 1 }
        : { year: c.year, month: c.month + 1 }
    );
  }

  function openCreateModal(dateISO: string) {
    setModalDate(dateISO);
    setModalPost(null);
    setModalOpen(true);
  }
  function openEditModal(post: Post) {
    setModalDate(post.date);
    setModalPost(post);
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }

  async function handleSave(input: PostModalSaveInput) {
    if (modalPost) {
      const res = await fetch(`/api/posts/${modalPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao salvar.");
      }
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === data.post.id ? data.post : p))
      );
    } else {
      if (!modalDate) return;
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          date: modalDate,
          client_id: clientId,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erro ao criar post.");
      }
      const data = await res.json();
      setPosts((prev) => [...prev, data.post]);
    }
  }

  async function handleDelete() {
    if (!modalPost) return;
    const res = await fetch(`/api/posts/${modalPost.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Erro ao excluir.");
    }
    setPosts((prev) => prev.filter((p) => p.id !== modalPost.id));
  }

  async function handleDropOnDay(dateISO: string, postId: string) {
    const existing = posts.find((p) => p.id === postId);
    if (!existing || existing.date === dateISO) return;

    // optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, date: dateISO } : p))
    );
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateISO }),
      });
      if (!res.ok) throw new Error("Erro ao mover post.");
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) => (p.id === data.post.id ? data.post : p))
      );
    } catch {
      // revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? existing : p))
      );
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [posts]);

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="leading-tight">
            <p className="font-bold text-sm sm:text-base">N1 Company</p>
            <p className="text-[11px] sm:text-xs text-white/50">
              {role === "admin" ? "Admin" : clientName ?? "Cliente"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {role === "admin" && (
            <select
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
              className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red max-w-[160px] sm:max-w-none"
            >
              <option value="" disabled className="bg-[#141414]">
                Selecione um cliente
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#141414]">
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleLogout}
            className="rounded-xl bg-white/[0.06] hover:bg-white/[0.12] transition text-sm font-semibold px-3 py-2"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goPrevMonth}
            aria-label="Mês anterior"
            className="rounded-xl bg-white/[0.06] hover:bg-white/[0.12] transition w-9 h-9 flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <h1 className="text-lg sm:text-2xl font-bold">
            {MONTH_LABELS[cursor.month - 1]} {cursor.year}
          </h1>
          <button
            onClick={goNextMonth}
            aria-label="Próximo mês"
            className="rounded-xl bg-white/[0.06] hover:bg-white/[0.12] transition w-9 h-9 flex items-center justify-center text-lg"
          >
            ›
          </button>
        </div>

        {error && (
          <p className="text-brand-red text-sm mb-3" role="alert">
            {error}
          </p>
        )}

        {!clientId ? (
          <p className="text-white/50 text-sm">
            Selecione um cliente para ver o calendário.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAY_LABELS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold text-white/50 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {grid.map((day) => {
                  const dateISO = toISODate(day);
                  const inMonth = day.getMonth() + 1 === cursor.month;
                  const isToday = isSameDay(day, today);
                  const dayPosts = postsByDate.get(dateISO) ?? [];

                  return (
                    <div
                      key={dateISO}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const postId = e.dataTransfer.getData("text/plain");
                        if (postId) handleDropOnDay(dateISO, postId);
                      }}
                      onClick={() => openCreateModal(dateISO)}
                      className={`min-h-[110px] sm:min-h-[130px] rounded-xl border p-1.5 flex flex-col gap-1 cursor-pointer transition ${
                        inMonth
                          ? "bg-white/[0.03] border-white/10"
                          : "bg-white/[0.01] border-white/5 opacity-40"
                      } ${
                        isToday
                          ? "ring-2 ring-brand-red border-transparent"
                          : ""
                      } hover:bg-white/[0.06]`}
                    >
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? "text-brand-red" : "text-white/60"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      <div className="flex flex-col gap-1 overflow-y-auto max-h-[90px] sm:max-h-[110px]">
                        {dayPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onClick={() => openEditModal(post)}
                            onDragStart={(e, p) => {
                              e.stopPropagation();
                              e.dataTransfer.setData("text/plain", p.id);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <p className="text-white/40 text-sm mt-4">Carregando...</p>
        )}
      </div>

      <PostModal
        open={modalOpen}
        date={modalDate}
        post={modalPost}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </main>
  );
}
