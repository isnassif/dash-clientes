import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Código de acesso é obrigatório." },
      { status: 400 }
    );
  }

  const adminCode = process.env.ADMIN_ACCESS_CODE;
  if (adminCode && code === adminCode) {
    const token = await signSession({ role: "admin" });
    const res = NextResponse.json({ role: "admin" });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return res;
  }

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .select("id, name")
    .eq("access_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao verificar o código." },
      { status: 500 }
    );
  }

  if (!client) {
    return NextResponse.json(
      { error: "Código de acesso inválido." },
      { status: 401 }
    );
  }

  const token = await signSession({ role: "client", clientId: client.id });
  const res = NextResponse.json({ role: "client", clientId: client.id });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return res;
}
