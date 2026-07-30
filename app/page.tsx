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
    const { data } = await supabaseAdmin
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });
    clients = data ?? [];
  } else if (session.clientId) {
    const { data } = await supabaseAdmin
      .from("clients")
      .select("id, name")
      .eq("id", session.clientId)
      .maybeSingle();
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
