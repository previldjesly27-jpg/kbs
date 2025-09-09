"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Statut = "nouveau" | "confirme" | "paye" | "termine";

type AdminInscription = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  responsable_nom: string | null;
  responsable_tel: string | null;
  specialites: string[] | null;
  programme: string | null; // 'semaine' | 'weekend'
  statut: Statut | null;    // NEW
};

const STYLES: Record<Statut, string> = {
  nouveau:  "bg-pink-50 text-pink-700 border border-pink-200",
  confirme: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  paye:     "bg-green-50 text-green-700 border border-green-200",
  termine:  "bg-slate-100 text-slate-700 border border-slate-200",
};

function StatutPill({ v }: { v?: string | null }) {
  const s = (v as Statut) || "nouveau";
  const label =
    s === "nouveau" ? "Nouveau" :
    s === "confirme" ? "Confirmé" :
    s === "paye" ? "Payé" : "Terminé";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${STYLES[s]}`}>
      {label}
    </span>
  );
}

export default function AdminInscriptionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminInscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statutFilter, setStatutFilter] = useState<"all" | Statut>("all");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("inscriptions")
      .select(
        "id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, specialites, programme, statut"
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

  const goToDetail = (id: string) => router.push(`/admin/inscriptions/${id}`);

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

  function fmtFrDateTime(d?: string | null) {
    return d ? new Date(d).toLocaleString("fr-FR") : "—";
  }
  function fmtDateFrFromIso(iso?: string | null) {
    if (!iso) return "—";
    const s = iso.includes("T") ? iso.slice(0, 10) : iso;
    const [y, m, dd] = s.split("-");
    return y && m && dd ? `${dd}/${m}/${y}` : "—";
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
  function formatProgramme(r: AdminInscription) {
    const horaire = (r.programme || "semaine").toLowerCase() === "weekend" ? "Weekend" : "Semaine";
    const first = r.specialites?.[0];
    return first ? `${labelProg(first)} / ${horaire}` : horaire;
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
      "Programme",
      "Statut",
    ];
    const lines = data.map((r) => {
      const progs = formatProgramme(r);
      const st = (r.statut || "nouveau")
        .replace("nouveau", "Nouveau")
        .replace("confirme", "Confirmé")
        .replace("paye", "Payé")
        .replace("termine", "Terminé");
      return [
        fmtFrDateTime(r.created_at),
        r.nom ?? "",
        r.email ?? "",
        r.telephone ?? "",
        fmtDateFrFromIso(r.date_naissance),
        r.responsable_nom ?? "",
        r.responsable_tel ?? "",
        progs,
        st,
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

  const view = useMemo(() => {
    const qlower = q.trim().toLowerCase();
    return rows
      .filter((r) =>
        statutFilter === "all" ? true : ((r.statut || "nouveau") === statutFilter)
      )
      .filter((r) => {
        if (!qlower) return true;
        const hay = [
          r.nom, r.email, r.telephone, r.responsable_nom, r.responsable_tel,
          formatProgramme(r),
        ].join(" ").toLowerCase();
        return hay.includes(qlower);
      });
  }, [rows, q, statutFilter]);

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full px-3 sm:px-6 py-4 text-pink-700">
        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-pink-500">Inscriptions</h1>
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-72 border border-pink-300 rounded-lg px-3 py-1.5 placeholder-pink-400"
            />
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as any)}
              className="border border-pink-300 text-pink-700 px-3 py-1.5 rounded-lg"
              title="Filtrer par statut"
            >
              <option value="all">Tous statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="confirme">Confirmé</option>
              <option value="paye">Payé</option>
              <option value="termine">Terminé</option>
            </select>

            <Link
              href="/admin"
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => exportCsv(view)}
              disabled={loading || view.length === 0}
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
            <button
              onClick={() => void handleLogout()}
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-220px)] overflow-auto rounded-xl border">
          <table className="w-full table-auto text-sm text-pink-700">
            <thead className="bg-pink-50 text-pink-700 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Naissance</th>
                <th className="px-4 py-2">Responsable</th>
                <th className="px-4 py-2">Tél. resp.</th>
                <th className="px-4 py-2">Programme</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-pink-500" colSpan={10}>
                    Chargement…
                  </td>
                </tr>
              ) : view.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-pink-500" colSpan={10}>
                    Aucune inscription.
                  </td>
                </tr>
              ) : (
                view.map((r) => (
                  <tr
                    key={r.id}
                    className="align-top cursor-pointer hover:bg-pink-50"
                    onClick={() => goToDetail(r.id)}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToDetail(r.id)}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">{fmtFrDateTime(r.created_at)}</td>
                    <td className="px-4 py-2 truncate">{r.nom}</td>
                    <td className="px-4 py-2 truncate">{r.email ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtTel(r.telephone)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDateFrFromIso(r.date_naissance)}</td>
                    <td className="px-4 py-2 truncate">{r.responsable_nom ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtTel(r.responsable_tel)}</td>
                    <td className="px-4 py-2">{formatProgramme(r) || "—"}</td>
                    <td className="px-4 py-2">
                      <StatutPill v={r.statut} />
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(r.id);
                        }}
                        className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
                      >
                        Éditer
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(r.id);
                        }}
                        className="bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600"
                      >
                        Supprimer
                      </button>
                      <button
  onClick={async (e) => {
    e.stopPropagation();
    // charge l'inscription
    const { data: insc, error } = await supabase
      .from("inscriptions")
      .select("nom, email, telephone, date_naissance, responsable_nom, responsable_tel, programme, specialites")
      .eq("id", r.id)
      .maybeSingle();
    if (error || !insc) return alert(error?.message || "Introuvable");

    // crée l'étudiant
    const { data: created, error: e2 } = await supabase
      .from("etudiants")
      .insert({
        nom: insc.nom,
        email: insc.email,
        telephone: insc.telephone,
        date_naissance: insc.date_naissance,
        responsable_nom: insc.responsable_nom,
        responsable_tel: insc.responsable_tel,
        programme: insc.programme,
        specialites: insc.specialites,
        statut: "actif",
      })
      .select("id")
      .single();
    if (e2) return alert(e2.message);

    // (option) marque l'inscription confirmée
    await supabase.from("inscriptions").update({ statut: "confirme" }).eq("id", r.id);

    // ouvre la fiche étudiant
    router.push(`/admin/etudiants/${created!.id}`);
  }}
  className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
>
  Confirmer → Étudiant
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
