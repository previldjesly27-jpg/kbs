"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AdminInscription = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  responsable_nom: string | null;
  responsable_tel: string | null;
  specialites: string[] | null;       // programmes multiples
  programme: string | null;           // 'semaine' | 'weekend'
};

export default function AdminInscriptionsPage() {
  const [rows, setRows] = useState<AdminInscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔎 états filtre/recherche
  const [q, setQ] = useState("");                // recherche texte
  const [horaire, setHoraire] = useState<"" | "semaine" | "weekend">(""); // filtre

  const router = useRouter();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("inscriptions")
      .select(
        "id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, specialites, programme"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AdminInscription[]);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Supprimer cette inscription ?");
    if (!ok) return;
    const { error } = await supabase.from("inscriptions").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  // Utils
  function fmtFrDate(d?: string | null) {
    if (!d) return "—";
    if (d.includes("T")) return new Date(d).toLocaleString("fr-FR");
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }
  function fmtTel(s?: string | null) {
    return s && s.trim() ? s : "—";
  }
  function labelProg(s: string) {
    const v = (s || "").toLowerCase();
    if (v === "cosmetologie") return "Cosmétologie";
    if (v === "style-crochet") return "Style crochet";
    if (v === "maquillage") return "Maquillage";
    if (v === "decoration") return "Décoration";
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
  }
  function formatProgramme(r: AdminInscription) {
    const horaire =
      (r.programme || "semaine").toLowerCase() === "weekend" ? "Weekend" : "Semaine";
    const first = (r.specialites && r.specialites.length > 0) ? r.specialites[0] : "";
    const spec = first ? labelProg(first) : "";
    return spec ? `${spec} / ${horaire}` : horaire;
  }
  const strip = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // ⚙️ Filtrage en mémoire (rapide et simple)
  const view = useMemo(() => {
    const qq = strip(q || "");
    return rows.filter((r) => {
      // filtre horaire
      if (horaire && (r.programme || "").toLowerCase() !== horaire) return false;

      if (!qq) return true;

      const hay = [
        r.nom || "",
        r.email || "",
        r.telephone || "",
        r.responsable_nom || "",
        r.responsable_tel || "",
        ...(r.specialites || []).map(labelProg),
        formatProgramme(r),
      ]
        .join(" ")
        .trim();

      return strip(hay).includes(qq);
    });
  }, [rows, q, horaire]);

  // CSV
  function csvEscape(v: unknown, sep = ";") {
    const s = String(v ?? "");
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCsv(data: AdminInscription[]) {
    const header = [
      "Date",
      "Nom",
      "Email",
      "Téléphone",
      "Naissance",
      "Responsable",
      "Tél. resp.",
      "Programme",
    ];

    const lines = data.map((r) => [
      fmtFrDate(r.created_at),
      r.nom ?? "",
      r.email ?? "",
      r.telephone ?? "",
      fmtFrDate(r.date_naissance),
      r.responsable_nom ?? "",
      r.responsable_tel ?? "",
      formatProgramme(r),
    ]);

    const sep = ";";
    const csv = [header, ...lines]
      .map((row) => row.map((v) => csvEscape(v, sep)).join(sep))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions_kbs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-white">
<section className="mx-auto max-w-7xl px-6 py-10 text-pink-700">        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-pink-500">Inscriptions</h1>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* 🔎 Recherche */}
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (nom, email, téléphone…)"
                className="w-72 border border-pink-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="text-pink-600 border border-pink-300 px-2 py-1 rounded-lg hover:bg-pink-50"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* 🎛️ Filtre horaire */}
            <select
              value={horaire}
              onChange={(e) => setHoraire(e.target.value as any)}
              className="border border-pink-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300"
              title="Filtrer par horaire"
            >
              <option value="">Tous horaires</option>
              <option value="semaine">Semaine</option>
              <option value="weekend">Weekend</option>
            </select>

            {/* Actions */}
            <button
              onClick={() => exportCsv(view)}
              disabled={loading || view.length === 0}
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50 disabled:opacity-60"
            >
              Exporter CSV ({view.length})
            </button>
            <button
              onClick={() => void load()}
              className="bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600"
            >
              Rafraîchir
            </button>
            <Link
              href="/admin"
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50 text-center"
            >
              ← Dashboard
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/admin");
              }}
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {err}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[9rem]" />
              <col className="w-[12rem]" />
              <col className="w-[18rem]" />
              <col className="w-[10rem]" />
              <col className="w-[9rem]" />
              <col className="w-[12rem]" />
              <col className="w-[10rem]" />
              <col className="w-[16rem]" />
              <col className="w-[8rem]" />
            </colgroup>

            <thead className="bg-pink-50 text-pink-600">
              <tr className="text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Naissance</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2">Tél. resp.</th>
                <th className="px-4 py-2">Programme</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-pink-500" colSpan={9}>
                    Chargement…
                  </td>
                </tr>
              ) : view.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-pink-500" colSpan={9}>
                    Aucune inscription.
                  </td>
                </tr>
              ) : (
                view.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {fmtFrDate(r.created_at)}
                    </td>
                    <td className="px-4 py-2 text-gray-700 truncate">{r.nom}</td>
                    <td className="px-4 py-2 text-gray-700 truncate">{r.email ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{fmtTel(r.telephone)}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {fmtFrDate(r.date_naissance)}
                    </td>
                    <td className="px-4 py-2 text-gray-700 truncate">
                      {r.responsable_nom ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {fmtTel(r.responsable_tel)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatProgramme(r) || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => void handleDelete(r.id)}
                        className="bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
