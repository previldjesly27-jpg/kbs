"use client";

import { useEffect, useState } from "react";
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
  specialites: string[] | null; // programmes multiples
};

export default function AdminInscriptionsPage() {
  const [rows, setRows] = useState<AdminInscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
        "id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, specialites"
      )
      .order("created_at", { ascending: false });

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

  function fmtFrDate(d?: string | null) {
    if (!d) return "—";
    if (d.includes("T")) return new Date(d).toLocaleDateString("fr-FR");
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }

  function fmtTel(s?: string | null) {
    return s && s.trim() ? s : "—";
  }

  function labelProg(s: string) {
    const v = s.toLowerCase();
    if (v === "cosmetologie") return "Cosmétologie";
    if (v === "style-crochet") return "Style crochet";
    if (v === "maquillage") return "Maquillage";
    if (v === "decoration") return "Décoration";
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  function uniqLabels(arr?: string[] | null) {
    if (!arr) return [];
    return Array.from(new Set(arr.map((x) => x.trim().toLowerCase()).filter(Boolean))).map(labelProg);
  }

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
      "Programmes",
    ];

    const lines = data.map((r) => {
      const progs = (r.specialites ?? []).map(labelProg).join(" / ");
      return [
        fmtFrDate(r.created_at),
        r.nom ?? "",
        r.email ?? "",
        r.telephone ?? "",
        fmtFrDate(r.date_naissance),
        r.responsable_nom ?? "",
        r.responsable_tel ?? "",
        progs,
      ];
    });

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
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-pink-500">Inscriptions</h1>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              ← Dashboard
            </Link>

            <button
              onClick={() => void handleLogout()}
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              Déconnexion
            </button>

            <button
              onClick={() => exportCsv(rows)}
              disabled={loading || rows.length === 0}
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50 disabled:opacity-60"
            >
              Exporter CSV
            </button>

            <button
              onClick={() => void load()}
              className="bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600"
            >
              Rafraîchir
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
            <colgroup><col className="w-[9rem]"/><col className="w-[12rem]"/><col className="w-[18rem]"/><col className="w-[10rem]"/><col className="w-[9rem]"/><col className="w-[12rem]"/><col className="w-[10rem]"/><col className="w-[16rem]"/><col className="w-[8rem]"/></colgroup>

            <thead className="bg-pink-50 text-pink-600">
              <tr className="text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Naissance</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2">Tél. resp.</th>
                <th className="px-4 py-2">Programmes</th>
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
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-pink-500" colSpan={9}>
                    Aucune inscription.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
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
                      {(!r.specialites || r.specialites.length === 0) ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {uniqLabels(r.specialites).map((lab) => (
                            <span
                              key={lab}
                              className="inline-flex items-center rounded-full border border-pink-300 bg-pink-50 px-2.5 py-0.5 text-pink-700"
                            >
                              {lab}
                            </span>
                          ))}
                        </div>
                      )}
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
