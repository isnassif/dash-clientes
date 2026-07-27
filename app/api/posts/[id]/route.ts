import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ContentType, PostStatus } from "@/types";

const VALID_CONTENT_TYPES: ContentType[] = [
  "Reels",
  "Story",
  "Ads",
  "Card",
  "Carrossel",
];
const VALID_STATUSES: PostStatus[] = ["Pendente", "Aprovado", "Publicado"];

async function loadPostClientId(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("client_id")
    .eq("id", id)
    .maybeSingle();
  return data?.client_id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingClientId = await loadPostClientId(params.id);
  if (!existingClientId) {
    return NextResponse.json({ error: "Post não encontrado." }, {
      status: 404,
    });
  }
  if (session.role === "client" && session.clientId !== existingClientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Título não pode ser vazio." }, {
        status: 400,
      });
    }
    update.title = title;
  }
  if (typeof body.date === "string" && body.date) {
    update.date = body.date;
  }
  if (typeof body.content_type === "string") {
    if (!VALID_CONTENT_TYPES.includes(body.content_type as ContentType)) {
      return NextResponse.json(
        { error: "Tipo de conteúdo inválido." },
        { status: 400 }
      );
    }
    update.content_type = body.content_type;
  }
  if (typeof body.status === "string") {
    if (!VALID_STATUSES.includes(body.status as PostStatus)) {
      return NextResponse.json({ error: "Status inválido." }, {
        status: 400,
      });
    }
    update.status = body.status;
  }
  if ("drive_link" in body) {
    const link =
      typeof body.drive_link === "string" && body.drive_link.trim()
        ? body.drive_link.trim()
        : null;
    update.drive_link = link;
  }

  // Admin may reassign a post to a different client; clients cannot.
  if (session.role === "admin" && typeof body.client_id === "string") {
    update.client_id = body.client_id;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, {
      status: 400,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("posts")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingClientId = await loadPostClientId(params.id);
  if (!existingClientId) {
    return NextResponse.json({ error: "Post não encontrado." }, {
      status: 404,
    });
  }
  if (session.role === "client" && session.clientId !== existingClientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("posts")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
