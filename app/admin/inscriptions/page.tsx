"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* =======================
   Types & helpers
======================= */

type AdminInscription = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;      // ISO "YYYY-MM-DD"
  responsable_nom: string | null;
  responsable_tel: string | null;
  specialites: string[] | null;       // text[]
  programme: string | null;           // 'semaine' | 'weekend'
};

type EditState = {
  nom: string;
  email: string;
  telephone: string;
  date_naissance_fr: string;          // "JJ/MM/AAAA"
  responsable_nom: string;
  responsable_tel: string;
  specialites: string[];
  programme: "" | "semaine" | "weekend";
};

const SPEC_OPTS = [
  { value: "maquillage", label: "Maquillage" },
  { value: "cosmetologie", label: "Cosmétologie" },
  { value: "decoration", label: "Décoration" },
  { value: "style-crochet", label: "Style crochet" },
];

const strip = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

function fmtDateFrFromIso(iso?: string | null) {
  if (!iso) return "";
  if (iso.includes("T")) iso = iso.slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}
function isoFromFr(fr: string): string | null {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, JJ, MM, YYYY] = m;
  const dd = Number(JJ), mm = Number(MM), yyyy = Number(YYYY);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${YYYY}-${MM}-${JJ}`;
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
  const horaire = (r.programme || "semaine").toLowerCase() === "weekend" ? "Weekend" : "Semaine";
  const first = (r.specialites && r.specialites.length > 0) ? r.specialites[0] : "";
  const spec = first ? labelProg(first) : "";
  return spec ? `${spec} / ${horaire}` : horaire;
}
function fmtFrDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR");
}

/* =======================
   Page
======================= */

export default function AdminInscriptionsPage() {
  const [rows, setRows] = useState<AdminInscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
const goToDetail = (id: string) => router.push(`/admin/inscriptions/${id}`);

  // 🔎 recherche & filtre (gardés de la version précédente)
  const [q, setQ] = useState("");
  const [horaire, setHoraire] = useState<"" | "semaine" | "weekend">("");

  // ✏️ édition
  const [editing, setEditing] = useState<AdminInscription | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

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

  // Ouvre l'éditeur
  function openEdit(r: AdminInscription) {
    setEditing(r);
    setEditErr(null);
    setForm({
      nom: r.nom || "",
      email: r.email || "",
      telephone: r.telephone || "",
      date_naissance_fr: fmtDateFrFromIso(r.date_naissance),
      responsable_nom: r.responsable_nom || "",
      responsable_tel: r.responsable_tel || "",
      specialites: [...(r.specialites || [])],
      programme: ((r.programme as any) || "") as any,
    });
  }
  function closeEdit() {
    if (saving) return;
    setEditing(null);
    setForm(null);
    setEditErr(null);
  }

  // Vue filtrée
  const view = useMemo(() => {
    const qq = strip(q || "");
    return rows.filter((r) => {
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
      ].join(" ");
      return strip(hay).includes(qq);
    });
  }, [rows, q, horaire]);

  // Export CSV de la vue
  function csvEscape(v: unknown, sep = ";") {
    const s = String(v ?? "");
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCsv(data: AdminInscription[]) {
    const header = ["Date", "Nom", "Email", "Téléphone", "Naissance", "Responsable", "Tél. resp.", "Programme"];
    const lines = data.map((r) => [
      fmtFrDateTime(r.created_at),
      r.nom ?? "",
      r.email ?? "",
      r.telephone ?? "",
      fmtDateFrFromIso(r.date_naissance),
      r.responsable_nom ?? "",
      r.responsable_tel ?? "",
      formatProgramme(r),
    ]);
    const sep = ";";
    const csv = [header, ...lines].map((row) => row.map((v) => csvEscape(v, sep)).join(sep)).join("\n");
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

  // Sauvegarde édition
  async function saveEdit() {
    if (!editing || !form) return;
    setSaving(true);
    setEditErr(null);

    // Validations
    if (!form.nom.trim() || !form.email.trim() || !form.telephone.trim() || !form.date_naissance_fr.trim()
      || !form.responsable_nom.trim() || !form.responsable_tel.trim()) {
      setEditErr("Tous les champs sont obligatoires.");
      setSaving(false);
      return;
    }
    if (onlyDigits(form.telephone).length < 7) {
      setEditErr("Téléphone invalide : au moins 7 chiffres.");
      setSaving(false);
      return;
    }
    if (onlyDigits(form.responsable_tel).length < 7) {
      setEditErr("Numéro responsable invalide : au moins 7 chiffres.");
      setSaving(false);
      return;
    }
    if (!form.programme) {
      setEditErr("Choisissez l'horaire (Semaine ou Weekend).");
      setSaving(false);
      return;
    }
    if (!form.specialites || form.specialites.length === 0) {
      setEditErr("Sélectionnez au moins une spécialité.");
      setSaving(false);
      return;
    }
    const iso = isoFromFr(form.date_naissance_fr);
    if (!iso) {
      setEditErr("Date de naissance invalide (JJ/MM/AAAA).");
      setSaving(false);
      return;
    }

    // Update Supabase
    const { error } = await supabase
      .from("inscriptions")
      .update({
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        date_naissance: iso,
        responsable_nom: form.responsable_nom.trim(),
        responsable_tel: form.responsable_tel.trim(),
        specialites: form.specialites.map((s) => s.toLowerCase()),
        programme: form.programme,
      })
      .eq("id", editing.id);

    if (error) {
      if ((error as any).code === "23505") {
        setEditErr("Doublon: même email + date de naissance.");
      } else {
        setEditErr(error.message || "Erreur lors de la mise à jour.");
      }
      setSaving(false);
      return;
    }

    // MAJ locale
    setRows((prev) =>
      prev.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              nom: form.nom.trim(),
              email: form.email.trim(),
              telephone: form.telephone.trim(),
              date_naissance: iso,
              responsable_nom: form.responsable_nom.trim(),
              responsable_tel: form.responsable_tel.trim(),
              specialites: [...form.specialites],
              programme: form.programme,
            }
          : r
      )
    );

    setSaving(false);
    closeEdit();
  }

  return (
    <main className="min-h-screen bg-white">
<section className="w-full px-3 sm:px-6 py-4 text-pink-700">        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Inscriptions</h1>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* 🔎 Recherche */}
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (nom, email, téléphone…)"
                className="w-72 border border-pink-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 text-pink-700 placeholder-pink-400"
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
          <div className="mb-4 rounded-xl border border-pink-200 bg-pink-50 text-pink-700 px-4 py-3">
            {err}
          </div>
        )}

<div className="h-[calc(100vh-220px)] overflow-auto rounded-xl border">
<table className="w-full table-auto text-sm text-pink-700">             

<thead className="bg-pink-50 text-pink-600 sticky top-0 z-10">            
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
  {view.map((r) => (
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
      <td className="px-4 py-2 whitespace-nowrap">{r.telephone || "—"}</td>
      <td className="px-4 py-2 whitespace-nowrap">{fmtDateFrFromIso(r.date_naissance) || "—"}</td>
      <td className="px-4 py-2 truncate">{r.responsable_nom ?? "—"}</td>
      <td className="px-4 py-2 whitespace-nowrap">{r.responsable_tel || "—"}</td>
      <td className="px-4 py-2">{formatProgramme(r) || "—"}</td>
      <td className="px-4 py-2 space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(r);
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
      </td>
    </tr>
  ))}
</tbody>


          </table>
        </div>
      </section>

      {/* MODAL ÉDITION */}
      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white ring-1 ring-pink-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-pink-100 px-5 py-3">
              <h2 className="text-lg font-semibold text-pink-700">Modifier l’inscription</h2>
              <button
                onClick={closeEdit}
                className="rounded-lg border border-pink-200 px-2 py-1 text-pink-600 hover:bg-pink-50"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-pink-600 mb-1">Nom *</label>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-600 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-600 mb-1">Téléphone *</label>
                  <input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-600 mb-1">Date de naissance (JJ/MM/AAAA) *</label>
                  <input
                    value={form.date_naissance_fr}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                      let out = raw;
                      if (raw.length > 4) out = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
                      else if (raw.length > 2) out = raw.slice(0, 2) + "/" + raw.slice(2);
                      setForm({ ...form, date_naissance_fr: out });
                    }}
                    placeholder="JJ/MM/AAAA"
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-600 mb-1">Responsable *</label>
                  <input
                    value={form.responsable_nom}
                    onChange={(e) => setForm({ ...form, responsable_nom: e.target.value })}
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-pink-600 mb-1">Tél. responsable *</label>
                  <input
                    value={form.responsable_tel}
                    onChange={(e) => setForm({ ...form, responsable_tel: e.target.value })}
                    className="w-full rounded-lg border border-pink-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Spécialités */}
              <div className="mt-4">
                <p className="text-sm text-pink-600 mb-2">Spécialités *</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SPEC_OPTS.map((opt) => {
                    const checked = form.specialites.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer
                        ${checked ? "border-pink-400 bg-pink-50" : "border-pink-200 hover:bg-pink-50/60"}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-pink-600"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(form.specialites);
                            if (e.target.checked) next.add(opt.value);
                            else next.delete(opt.value);
                            setForm({ ...form, specialites: Array.from(next) });
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Programme */}
              <div className="mt-3">
                <p className="text-sm text-pink-600 mb-2">Horaire *</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer
                    ${form.programme === "semaine" ? "border-pink-400 bg-pink-50" : "border-pink-200 hover:bg-pink-50/60"}`}>
                    <input
                      type="radio"
                      className="accent-pink-600"
                      checked={form.programme === "semaine"}
                      onChange={() => setForm({ ...form, programme: "semaine" })}
                    />
                    <span>Semaine</span>
                  </label>
                  <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer
                    ${form.programme === "weekend" ? "border-pink-400 bg-pink-50" : "border-pink-200 hover:bg-pink-50/60"}`}>
                    <input
                      type="radio"
                      className="accent-pink-600"
                      checked={form.programme === "weekend"}
                      onChange={() => setForm({ ...form, programme: "weekend" })}
                    />
                    <span>Weekend</span>
                  </label>
                </div>
              </div>

              {/* Erreur */}
              {editErr && (
                <div className="mt-3 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-pink-700">
                  {editErr}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={closeEdit}
                  disabled={saving}
                  className="border border-pink-300 text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-60"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
