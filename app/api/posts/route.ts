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

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? "", 10); // 1-12
  const year = parseInt(searchParams.get("year") ?? "", 10);

  let clientId = searchParams.get("clientId");
  if (session.role === "client") {
    clientId = session.clientId ?? null;
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId é obrigatório." }, {
      status: 400,
    });
  }

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "month e year válidos são obrigatórios." },
      { status: 400 }
    );
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonthDate = new Date(year, month, 0); // last day of month
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
    endMonthDate.getDate()
  ).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const content_type = body.content_type as ContentType;
  const status = (body.status as PostStatus) ?? "Pendente";
  const drive_link =
    typeof body.drive_link === "string" && body.drive_link.trim()
      ? body.drive_link.trim()
      : null;

  let client_id: string | null = null;
  if (session.role === "client") {
    client_id = session.clientId ?? null;
  } else {
    client_id = typeof body.client_id === "string" ? body.client_id : null;
  }

  if (!client_id) {
    return NextResponse.json({ error: "client_id é obrigatório." }, {
      status: 400,
    });
  }
  if (!title) {
    return NextResponse.json({ error: "Título é obrigatório." }, {
      status: 400,
    });
  }
  if (!date) {
    return NextResponse.json({ error: "Data é obrigatória." }, {
      status: 400,
    });
  }
  if (!VALID_CONTENT_TYPES.includes(content_type)) {
    return NextResponse.json(
      { error: "Tipo de conteúdo inválido." },
      { status: 400 }
    );
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert({
      client_id,
      date,
      title,
      content_type,
      status,
      drive_link,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
