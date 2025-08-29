"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const CATS = ["maquillage", "cosmetologie", "decoration", "autres"] as const;
type Cat = typeof CATS[number];

type KPIs = {
  totalInsc: number | null;
  weeklyInsc: number | null;
  totalTem: number | null;
  avgNote30: number | null;
  galleryTotal: number | null;
  galleryByCat: Record<Cat, number>;
  lastUpload: string | null;
};

export default function AdminHome() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({
    totalInsc: null,
    weeklyInsc: null,
    totalTem: null,
    avgNote30: null,
    galleryTotal: null,
    galleryByCat: { maquillage: 0, cosmetologie: 0, decoration: 0, autres: 0 },
    lastUpload: null,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const since7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);
  const since30 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }, []);

useEffect(() => {
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login?next=/admin"); return; }

    const { data: ok } = await supabase.rpc("is_admin");
    if (ok !== true) {
      await supabase.auth.signOut();
      router.replace("/admin/login?next=/admin");
      return;
    }

    setAuthChecked(true);
    await fetchKPIs();
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [router]);

 // eslint-disable-line

  async function fetchKPIs() {
    try {
      setLoading(true);
      setErr(null);

      // Inscriptions
      const [{ count: totalInsc }, { count: weeklyInsc }] = await Promise.all([
        supabase.from("inscriptions").select("id", { count: "exact", head: true }),
        supabase.from("inscriptions").select("id", { count: "exact", head: true }).gte("created_at", since7),
      ]);

      // Témoignages
      const { count: totalTem } = await supabase.from("temoignages").select("id", { count: "exact", head: true });
      const { data: notes, error: notesErr } = await supabase
        .from("temoignages")
        .select("note")
        .not("note", "is", null)
        .gte("created_at", since30);
      if (notesErr) throw notesErr;
      const avgNote30 =
        notes && notes.length
          ? Math.round((notes.reduce((s, n) => s + (Number((n as any).note) || 0), 0) / notes.length) * 10) / 10
          : null;

      // Galerie (compte par catégorie + total + dernier upload)
      const galleryByCat: Record<Cat, number> = { maquillage: 0, cosmetologie: 0, decoration: 0, autres: 0 };
      let galleryTotal = 0;
      let lastUpload: string | null = null;

      for (const cat of CATS) {
        // list peut ne pas renvoyer created_at sur certaines versions — on lit updated_at si présent
        const { data, error } = await supabase.storage.from("galerie").list(cat, {
          limit: 1000,
          sortBy: { column: "name", order: "desc" }, // tri par nom, on calcule la date nous-mêmes
        });
        if (error) {
          // bucket absent -> laisser 0
          continue;
        }
        const arr = data ?? [];
        galleryByCat[cat] = arr.length;
        galleryTotal += arr.length;

        for (const it of arr) {
          const created: string | undefined = (it as any).created_at || (it as any).updated_at;
          if (created && (!lastUpload || created > lastUpload)) {
            lastUpload = created;
          }
        }
      }

      setKpis({
        totalInsc: totalInsc ?? 0,
        weeklyInsc: weeklyInsc ?? 0,
        totalTem: totalTem ?? 0,
        avgNote30,
        galleryTotal,
        galleryByCat,
        lastUpload,
      });
    } catch (e: any) {
      setErr(e?.message || "Erreur lors du chargement des indicateurs");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  async function exportInscriptionsCSV() {
  try {
    const { data, error } = await supabase
      .from("inscriptions")
      .select("created_at, nom, email, telephone, date_naissance")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const header = ["Date", "Nom", "Email", "Téléphone", "Date de naissance"];
    const csv = [
      header.join(","),
      ...rows.map((r: any) => {
        const created = new Date(r.created_at).toLocaleString("fr-FR").replaceAll(",", "");
        const birth = r.date_naissance ? String(r.date_naissance).split("-").reverse().join("/") : "";
        return [
          created,
          r.nom ?? "",
          r.email ?? "",
          r.telephone ?? "",
          birth,
        ]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e?.message || "Erreur export CSV");
  }
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-pink-500">Tableau de bord</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
          >
            Déconnexion
          </button>
        </div>

        {err && <p className="mb-4 text-red-600">{err}</p>}

        {/* Cartes KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Inscriptions (total)" value={loading ? "…" : kpis.totalInsc ?? 0} />
          <Card title="Inscriptions (7 jours)" value={loading ? "…" : kpis.weeklyInsc ?? 0} />
          <Card title="Témoignages (total)" value={loading ? "…" : kpis.totalTem ?? 0} />
          <Card
            title="Note moyenne (30 j)"
            value={loading ? "…" : kpis.avgNote30 !== null ? `${kpis.avgNote30}/5` : "—"}
          />
        </div>

        {/* Galerie - stats */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card title="Images galerie (total)" value={loading ? "…" : kpis.galleryTotal ?? 0} />
          <div className="rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-2">Images par catégorie</p>
            <ul className="text-pink-600 grid grid-cols-2 gap-y-1">
              {CATS.map((c) => (
                <li key={c} className="flex items-center justify-between">
                  <span className="capitalize">{c}</span>
                  <span className="font-semibold">
                    {loading ? "…" : kpis.galleryByCat[c]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border p-5">
            <p className="text-sm text-gray-500">Dernier upload</p>
            <p className="mt-1 text-2xl font-bold text-pink-500">
              {loading
                ? "…"
                : kpis.lastUpload
                ? new Date(kpis.lastUpload).toLocaleString()
                : "—"}
            </p>
          </div>
        </div>

        {/* Raccourcis */}
        <div className="mt-8 grid sm:grid-cols-3 gap-6">
          <Link href="/admin/inscriptions" className="block rounded-xl border p-6 hover:shadow">
            <h2 className="text-xl font-semibold text-pink-500">Inscriptions</h2>
            <p className="text-gray-600">Voir et gérer les inscriptions.</p>
          </Link>
          <Link href="/admin/temoignages" className="block rounded-xl border p-6 hover:shadow">
            <h2 className="text-xl font-semibold text-pink-500">Témoignages</h2>
            <p className="text-gray-600">Modérer les témoignages publiés.</p>
          </Link>
          <Link href="/admin/galerie" className="block rounded-xl border p-6 hover:shadow">
            <h2 className="text-xl font-semibold text-pink-500">Galerie</h2>
            <p className="text-gray-600">Uploader et gérer les images.</p>
          </Link>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={fetchKPIs}
            className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600 transition"
          >
            Rafraîchir les stats
          </button>
          <button
            onClick={exportInscriptionsCSV}
            className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
          >
            Exporter les inscriptions (CSV)
          </button>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-pink-500">{value}</p>
    </div>
  );
}
