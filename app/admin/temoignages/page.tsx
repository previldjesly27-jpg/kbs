"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Temoignage = {
  id: string;
  created_at: string;
  nom: string;
  message: string;
  note: number | null;
};

export default function AdminTemoignagesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Temoignage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("temoignages")
      .select("id, created_at, nom, message, note")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

useEffect(() => {
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login?next=/admin/temoignages"); return; }

    const { data: ok } = await supabase.rpc("is_admin");
    if (ok !== true) {
      await supabase.auth.signOut();
      router.replace("/admin/login?next=/admin/temoignages");
      return;
    }

    setAuthChecked(true);
    await load();
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [router]);



  async function handleDelete(id: string) {
    const ok = confirm("Confirmer la suppression du témoignage ?");
    if (!ok) return;
    const { error } = await supabase.from("temoignages").delete().eq("id", id);
    if (error) {
      alert("Erreur: " + error.message);
      return;
    }
    await load();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-pink-500">Vérification de la session…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold text-pink-500">Témoignages (admin)</h1>
  <div className="flex items-center gap-3">
    <Link
      href="/admin"
      className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
    >
      ← Dashboard
    </Link>
    <button
      onClick={load}
      className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600 transition"
    >
      Rafraîchir
    </button>
    <button
      onClick={handleLogout}
      className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
    >
      Déconnexion
    </button>
  </div>
</div>


        {err && <p className="mb-4 text-red-600">{err}</p>}

        <div className="grid md:grid-cols-2 gap-6">
          {rows.length === 0 && !loading ? (
            <p className="text-pink-500">Aucun témoignage pour le moment.</p>
          ) : (
            rows.map((t) => (
              <article key={t.id} className="rounded-xl border p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 break-words">
                    {t.nom?.trim() || "Anonyme"}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>

                {typeof t.note === "number" && (
                  <div className="mb-2" aria-label={`Note ${t.note}/5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg
                        key={i}
                        className={i < (t.note ?? 0) ? "text-yellow-300" : "text-gray-300"}
                        width="20" height="20" viewBox="0 0 24 24"
                        fill="currentColor" aria-hidden="true"
                        style={{ display: "inline-block", verticalAlign: "middle" }}
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    ))}
                  </div>
                )}

                <p className="text-gray-700 whitespace-pre-wrap mb-4">{t.message}</p>

                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-3 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition"
                  title="Supprimer"
                >
                  Supprimer
                </button>
              </article>
            ))
          )}
        </div>

        {loading && <p className="mt-4 text-pink-500">Chargement…</p>}
      </section>
    </main>
  );
}
