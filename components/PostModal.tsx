"use client";

import { useEffect, useState } from "react";
import type { ContentType, Post, PostStatus } from "@/types";

const CONTENT_TYPES: ContentType[] = [
  "Reels",
  "Story",
  "Ads",
  "Card",
  "Carrossel",
];
const STATUSES: PostStatus[] = ["Pendente", "Aprovado", "Publicado"];

export type PostModalSaveInput = {
  title: string;
  content_type: ContentType;
  status: PostStatus;
  drive_link: string;
};

export default function PostModal({
  open,
  date,
  post,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  date: string | null;
  post: Post | null;
  onClose: () => void;
  onSave: (input: PostModalSaveInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Reels");
  const [status, setStatus] = useState<PostStatus>("Pendente");
  const [driveLink, setDriveLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(post?.title ?? "");
      setContentType(post?.content_type ?? "Reels");
      setStatus(post?.status ?? "Pendente");
      setDriveLink(post?.drive_link ?? "");
      setError(null);
      setClosing(false);
    }
  }, [open, post]);

  if (!open && !closing) return null;

  function requestClose() {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 150);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        content_type: contentType,
        status,
        drive_link: driveLink.trim(),
      });
      requestClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      requestClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
      setDeleting(false);
    }
  }

  const isEdit = !!post;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity ${
        open && !closing ? "opacity-100" : "opacity-0"
      }`}
      onClick={requestClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl bg-[#141414]/90 border border-white/10 backdrop-blur-xl p-6 flex flex-col gap-4 ${
          open && !closing ? "animate-fade-scale-in" : "animate-fade-scale-out"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? "Editar post" : "Novo post"}
          </h2>
          <span className="text-xs text-white/40">{date}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/60">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Post de lançamento"
            className="rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/60">Tipo de conteúdo</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct} className="bg-[#141414]">
                  {ct}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/60">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className="rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[#141414]">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-white/60">Link do Google Drive</label>
          <input
            type="url"
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition"
          />
        </div>

        {error && (
          <p className="text-sm text-brand-red font-medium" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="flex-1 rounded-xl bg-brand-red hover:bg-brand-red/90 disabled:opacity-60 transition font-bold py-2.5"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-60 transition font-semibold py-2.5 px-4"
            >
              {deleting ? "..." : "Excluir"}
            </button>
          )}
          <button
            onClick={requestClose}
            disabled={saving || deleting}
            className="rounded-xl bg-transparent hover:bg-white/[0.06] transition font-semibold py-2.5 px-4"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
