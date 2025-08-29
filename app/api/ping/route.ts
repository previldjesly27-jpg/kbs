// app/api/ping/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  // On teste la connexion en essayant de lire 1 ligne de "inscriptions".
  // Si la table n'existe pas encore, on considère quand même la connexion OK.
  const { data, error } = await supabase.from("inscriptions").select("*").limit(1);

  if (error) {
    // Code Postgres "table n'existe pas" → connexion OK mais table à créer
    const isMissingTable = (error as any)?.code === "42P01";
    return NextResponse.json({
      ok: true,
      connected: true,
      table_exists: !isMissingTable,
      note: isMissingTable ? "Connexion OK, crée la table `inscriptions`." : error.message,
    });
  }

  return NextResponse.json({ ok: true, connected: true, table_exists: true, sample_count: data?.length ?? 0 });
}
