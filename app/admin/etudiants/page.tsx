"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/*========================
  Types + helpers
========================*/
type Etu = {
  id: string;
  created_at: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  programme: string | null;        // "maquillage" | "cosmetologie" | "decoration" | null
  specialites: string[] | null;    // on regarde specialites[0] si programme est vide
  groupe: string | number | null;  // "semaine" | "weekend" | 1 | 2 | null
  statut: string | null;           // "actif" etc.
};

const strip = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const fmtDateTimeFR = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR") : "—";

const labelProg = (s?: string | null) => {
  const v = (s || "").toLowerCase();
  if (v === "maquillage") return "Maquillage";
  if (v === "cosmetologie") return "Cosmétologie";
  if (v === "decoration") return "Décoration";
  if (v === "style-crochet") return "Style crochet";
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "—";
};

// -> priorité à etudiants.programme, fallback sur specialites[0]
const programmeLabel = (r: Etu) =>
  labelProg(r.programme || (r.specialites?.[0] ?? ""));

const groupeLabel = (g?: string | number | null) => {
  if (typeof g === "number") return g === 2 ? "Weekend" : "Semaine";
  const v = (g || "").toLowerCase();
  return v.includes("week") ? "Weekend" : v ? "Semaine" : "—";
};
function monthFromIso(iso?: string | null): number | null {
  if (!iso) return null;
  const s = iso.includes('T') ? iso.slice(0, 10) : iso; // YYYY-MM-DD
  const [, m] = s.split('-');
  const n = Number(m);
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
}

const MONTHS = [
  '', 'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];
function fmtBirth(d?: string | null) {
  if (!d) return "—";
  const t = d.trim();
  // ISO 2024-09-14 (ou avec T…)
  if (t.includes("-")) {
    const s = t.includes("T") ? t.slice(0, 10) : t;
    const [y, m, dd] = s.split("-");
    return dd && m && y ? `${dd}/${m}/${y}` : t;
  }
  // Probablement déjà au format FR (14/09/2024)
  return t;
}

function exportCsvEtudiants(data: any[]) {
  // Petits helpers locaux
  const csvEscape = (v: unknown, sep = ";") => {
    const s = String(v ?? "");
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const fmtDateTimeFR = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-FR") : "";
  const labelProg = (p?: string | null) => {
    const v = (p || "").toLowerCase();
    if (v === "maquillage") return "Maquillage";
    if (v === "cosmetologie") return "Cosmétologie";
    if (v === "decoration") return "Décoration";
    if (v === "style-crochet") return "Style crochet";
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
  };
  const programmeLabel = (r: any) =>
    labelProg(r.programme || (r.specialites?.[0] ?? ""));
  const groupeLabel = (g?: string | number | null) => {
    if (typeof g === "number") return g === 2 ? "Weekend" : "Semaine";
    const v = (g || "").toLowerCase();
    return v.includes("week") ? "Weekend" : v ? "Semaine" : "";
  };
  const statutLabel = (s?: string | null) => {
    const v = (s || "actif").toLowerCase();
    if (v === "archive") return "Archivé";
    return "Actif";
  };

  const header = ["Date", "Nom", "Email", "Téléphone", "Programme", "Groupe","Naissance", "Statut"];
  const lines = data.map((r) => [
    fmtDateTimeFR(r.created_at),
    r.nom ?? "",
    r.email ?? "",
    r.telephone ?? "",
    fmtBirth(r.date_naissance),
    programmeLabel(r),
    groupeLabel(r.groupe),
    statutLabel(r.statut),
  ]);

  const sep = ";";
  const csv = [header, ...lines]
    .map((row) => row.map((v) => csvEscape(v, sep)).join(sep))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etudiants_kbs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


/*========================
  Page
========================*/
export default function AdminEtudiantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Etu[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
const [birthMonth, setBirthMonth] = useState<'all' | number>('all');

  // filtres basiques
  const [q, setQ] = useState("");
  const [grp, setGrp] = useState<"" | "semaine" | "weekend">("");
  const [statut, setStatut] = useState<"" | "actif" | "archive">("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
  .from("etudiants")
  .select(
    "id, created_at, nom, email, telephone, date_naissance, programme, groupe, statut"
  )
  .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Etu[]);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Supprimer cet étudiant ?");
    if (!ok) return;
    const { error } = await supabase.from("etudiants").delete().eq("id", id);
    if (error) return alert(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  const view = useMemo(() => {
  const needle = strip(q);
  return rows.filter((r) => {
    // filtre groupe
    if (grp) {
      const g = groupeLabel(r.groupe).toLowerCase();
      if (g !== grp) return false;
    }

    // filtre statut
    if (statut && (r.statut || "actif").toLowerCase() !== statut) return false;

    // ✅ filtre mois de naissance (birthMonth = 'all' | 1..12)
    if (birthMonth !== 'all') {
      const m = monthFromIso(r.date_naissance); // YYYY-MM-DD -> 1..12
      if (m !== birthMonth) return false;
    }

    if (!needle) return true;
    const hay = [
      r.nom || "",
      r.email || "",
      r.telephone || "",
      programmeLabel(r),
      groupeLabel(r.groupe),
    ]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return hay.includes(needle);
  });
}, [rows, q, grp, statut, birthMonth]); // 👈 ajoute birthMonth ici


  return (
    <main className="min-h-screen bg-white">
      <section className="w-full px-3 sm:px-6 py-4 text-pink-700">
        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-pink-500">Étudiants</h1>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-72 border border-pink-300 rounded-lg px-3 py-1.5 placeholder-pink-400"
            />
            <select
              value={grp}
              onChange={(e) => setGrp(e.target.value as any)}
              className="border border-pink-300 rounded-lg px-3 py-1.5"
              title="Filtrer par groupe"
            >
              <option value="">Tous groupes</option>
              <option value="semaine">Semaine</option>
              <option value="weekend">Weekend</option>
            </select>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as any)}
              className="border border-pink-300 rounded-lg px-3 py-1.5"
              title="Filtrer par statut"
            >
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="archive">Archivé</option>
            </select>
           <select
  value={birthMonth}
  onChange={(e) =>
    setBirthMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
  }
  className="border border-pink-300 text-pink-700 px-3 py-1.5 rounded-lg"
  title="Filtrer par mois de naissance"
>
  <option value="all">Tous mois</option>
  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
    <option key={m} value={m}>{MONTHS[m]}</option>
  ))}
</select>

            <Link
              href="/admin"
              className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
            >
              ← Dashboard
            </Link>
            <button
  onClick={() => exportCsvEtudiants(view /* ou rows si tu n'as pas de filtre */)}
  disabled={loading || (view?.length ?? 0) === 0}
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

        {err && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {err}
          </div>
        )}

        {/* Tableau plein écran */}
        <div className="h-[calc(100vh-220px)] overflow-auto rounded-xl border">
          <table className="w-full table-auto text-sm text-pink-700">
            <thead className="bg-pink-50 text-pink-700 sticky top-0 z-10">
              <tr className="text-left">
                <th className="px-4 py-2">Créé</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Téléphone</th>
                <th className="px-4 py-2">Programme</th>
                <th className="px-4 py-2">Groupe</th>
                <th className="px-4 py-2">Naissance</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-pink-500" colSpan={8}>
                    Chargement…
                  </td>
                </tr>
              ) : view.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-pink-500" colSpan={8}>
                    Aucun étudiant.
                  </td>
                </tr>
              ) : (
                view.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-pink-50">
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDateTimeFR(r.created_at)}</td>
<td className="px-4 py-2 truncate">
  {r.nom ? (
    <a
      href={`/admin/etudiants/${r.id}`}
      onClick={(e) => e.stopPropagation()}
      className="text-pink-600 hover:underline inline-block focus:outline-none focus:ring-2 focus:ring-pink-300 rounded-sm"
      title="Ouvrir la fiche"
    >
      {r.nom}
    </a>
  ) : "—"}
</td>


                    <td className="px-4 py-2 truncate">{r.email ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.telephone ?? "—"}</td>

                    {/* ✅ Programme fiable (programme || specialites[0]) */}
                    <td className="px-4 py-2">{programmeLabel(r)}</td>

                    {/* ✅ Groupe fonctionne avec texte OU entier */}
                    <td className="px-4 py-2">{groupeLabel(r.groupe)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtBirth(r.date_naissance)}</td>


                    <td className="px-4 py-2">{(r.statut || "Actif").charAt(0).toUpperCase() + (r.statut || "Actif").slice(1)}</td>

                    <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/etudiants/${r.id}`}
                        className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
                      >
                        Ouvrir
                      </Link>
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
