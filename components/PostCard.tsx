"use client";

import type { Post } from "@/types";

const STATUS_STYLES: Record<Post["status"], { bg: string; text: string }> = {
  Pendente: { bg: "#E1261C", text: "#FFFFFF" },
  Aprovado: { bg: "#FFCC33", text: "#1A1A1A" },
  Publicado: { bg: "#34C759", text: "#FFFFFF" },
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
      style={{ backgroundColor: style.bg, color: style.text }}
      className="rounded-lg px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing flex flex-col gap-1 shadow-sm hover:brightness-95 transition"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold truncate leading-tight">
          {post.title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: "rgba(0,0,0,0.18)", color: style.text }}
        >
          {post.content_type}
        </span>
        {post.drive_link && (
          <a
            href={post.drive_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] underline underline-offset-2 opacity-90 hover:opacity-100 shrink-0"
          >
            Drive
          </a>
        )}
      </div>
    </div>
  );
}
