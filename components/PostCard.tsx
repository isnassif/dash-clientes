"use client";

import type { Post } from "@/types";

const STATUS_STYLES: Record<
  Post["status"],
  { accent: string; label: string }
> = {
  Pendente: { accent: "#E1261C", label: "Pendente" },
  Aprovado: { accent: "#F0B429", label: "Aprovado" },
  Publicado: { accent: "#2FBE72", label: "Publicado" },
};

export default function PostCard({
  post,
  onClick,
  draggable = true,
  onDragStart,
}: {
  post: Post;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, post: Post) => void;
}) {
  const style = STATUS_STYLES[post.status];

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, post)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      role="button"
      tabIndex={0}
      style={{ borderLeftColor: style.accent }}
      className="group rounded-md rounded-l-[3px] border-l-[3px] bg-surface-raised/90 hover:bg-surface-raised px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing flex flex-col gap-1 transition"
    >
      <span className="font-medium text-ink truncate leading-tight">
        {post.title}
      </span>
      <div className="flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-widest2 uppercase text-ink-muted">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: style.accent }}
          />
          {post.content_type}
        </span>
        {post.drive_link && (
          <a
            href={post.drive_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-ink-muted underline underline-offset-2 hover:text-ink transition shrink-0"
          >
            Drive
          </a>
        )}
      </div>
    </div>
  );
}
