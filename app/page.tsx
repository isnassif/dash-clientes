import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CalendarApp from "@/components/CalendarApp";
import type { Client } from "@/types";

export default async function HomePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let clients: Client[] = [];
  let clientName: string | null = null;

  if (session.role === "admin") {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) {
      console.error("Erro ao buscar clients no Supabase:", error);
    }
    clients = data ?? [];
  } else if (session.clientId) {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name")
      .eq("id", session.clientId)
      .maybeSingle();
    if (error) {
      console.error("Erro ao buscar client no Supabase:", error);
    }
    clientName = data?.name ?? null;
  }

  return (
    <CalendarApp
      role={session.role}
      clients={clients}
      initialClientId={
        session.role === "admin" ? clients[0]?.id ?? null : session.clientId ?? null
      }
      clientName={clientName}
    />
  );
}
