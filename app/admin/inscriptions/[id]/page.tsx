"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "inscriptions"; // 1 casier = 1 dossier: /<id>/

type Row = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;   // "YYYY-MM-DD"
  responsable_nom: string | null;
  responsable_tel: string | null;
  specialites: string[] | null;    // ["maquillage", ...]
  programme: string | null;        // "semaine" | "weekend"
  notes?: string | null;           // (facultatif si tu l’as ajouté)
};

const SPECIALITES = [
  { value: "maquillage", label: "Maquillage" },
  { value: "cosmetologie", label: "Cosmétologie" },
  { value: "decoration", label: "Décoration" },
  { value: "style-crochet", label: "Style crochet" },
];

// -- helpers dates FR <-> ISO --
function toFrFromIso(iso?: string | null) {
  if (!iso) return "";
  const s = iso.includes("T") ? iso.slice(0, 10) : iso;
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
function toIsoFromFr(fr: string) {
  const m = fr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const D = new Date(+yyyy, +mm - 1, +dd);
  if (D.getFullYear() !== +yyyy || D.getMonth() !== +mm - 1 || D.getDate() !== +dd) return null;
  return `${yyyy}-${mm}-${dd}`;
}
function fmtDateTimeFr(d?: string | null) {
  return d ? new Date(d).toLocaleString("fr-FR") : "—";
}
function labelSpec(s: string) {
  const v = s.toLowerCase();
  if (v === "cosmetologie") return "Cosmétologie";
  if (v === "style-crochet") return "Style crochet";
  if (v === "maquillage") return "Maquillage";
  if (v === "decoration") return "Décoration";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function InscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);

  // ---- FORM STATE (éditable) ----
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateFr, setDateFr] = useState(""); // JJ/MM/AAAA
  const [responsableNom, setResponsableNom] = useState("");
  const [responsableTel, setResponsableTel] = useState("");
  const [programme, setProgramme] = useState<"semaine" | "weekend">("semaine");
  const [specs, setSpecs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ---- NOTES (optionnel) ----
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // ---- PHOTOS (casier) ----
  type Photo = { name: string; path: string; url: string };
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);

  // Charge la fiche + photos
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("inscriptions")
        .select("id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, specialites, programme, notes")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        setErr(error?.message || "Inscription introuvable");
        setLoading(false);
        return;
      }

      const r = data as Row;
      setRow(r);

      // Init form
      setNom(r.nom || "");
      setEmail(r.email || "");
      setTelephone(r.telephone || "");
      setDateFr(toFrFromIso(r.date_naissance));
      setResponsableNom(r.responsable_nom || "");
      setResponsableTel(r.responsable_tel || "");
      setProgramme((r.programme as any) === "weekend" ? "weekend" : "semaine");
      setSpecs(Array.from(new Set((r.specialites || []).map(s => s.toLowerCase().trim()))));
      setNotes(r.notes || "");

      await loadPhotos(id);
      setLoading(false);
    })();
  }, [id]);

  async function loadPhotos(theId: string) {
    const { data: listed, error } = await supabase.storage.from(BUCKET).list(theId, {
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });
    if (error) {
      console.error(error);
      setPhotos([]);
      return;
    }
    const arr: Photo[] = (listed || []).filter(f => f.name).map(f => {
      const path = `${theId}/${f.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { name: f.name, path, url: data.publicUrl };
    });
    setPhotos(arr);
  }

  // ---- Save fiche ----
  async function save() {
    if (!row) return;
    setSaving(true);
    setErr(null);

    // date
    const iso = dateFr ? toIsoFromFr(dateFr) : null;
    if (dateFr && !iso) {
      setErr("Date invalide (utilise JJ/MM/AAAA)");
      setSaving(false);
      return;
    }

    const payload = {
      nom: nom.trim(),
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      date_naissance: iso,
      responsable_nom: responsableNom.trim() || null,
      responsable_tel: responsableTel.trim() || null,
      programme,
      specialites: Array.from(new Set(specs.map(s => s.toLowerCase().trim()))),
    };

    const { error } = await supabase.from("inscriptions").update(payload).eq("id", row.id);
    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }
    // rafraîchit l'état local
    setRow({ ...(row as Row), ...payload } as Row);
    alert("Fiche enregistrée ✅");
  }

  // ---- Notes ----
  async function saveNotes() {
    if (!row) return;
    setSavingNotes(true);
    const { error } = await supabase.from("inscriptions").update({ notes: notes || null }).eq("id", row.id);
    setSavingNotes(false);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Notes enregistrées ✅");
  }

  // ---- Upload / Delete ----
async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const inputEl = e.currentTarget;                     // ✅ on capture l'input AVANT tout await
  if (!id) return;

  const files = inputEl.files ? Array.from(inputEl.files) : [];
  if (files.length === 0) return;

  setUploading(true);
  try {
    for (const file of files) {
      const safe = file.name.replace(/\s+/g, "_");
      const path = `${id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
    }
    await loadPhotos(id);
  } catch (err: any) {
    alert(err?.message || "Échec de l’upload");
  } finally {
    setUploading(false);
    // ✅ on nettoie l'input sans repasser par l'événement (qui est null)
    try { inputEl.value = ""; } catch {}
  }
}


  async function removePhoto(p: Photo) {
    const ok = confirm("Supprimer cette photo ?");
    if (!ok) return;
    const { error } = await supabase.storage.from(BUCKET).remove([p.path]);
    if (error) {
      alert(error.message);
      return;
    }
    setPhotos(prev => prev.filter(x => x.path !== p.path));
  }

  // UI
  if (!id) return <main className="min-h-screen p-6 text-pink-700">ID manquant.</main>;
  if (loading) return <main className="min-h-screen p-6 text-pink-700">Chargement…</main>;
  if (err || !row) return <main className="min-h-screen p-6 text-pink-700">Erreur : {err || "Introuvable"}</main>;

  const programmeText = (row.programme || "semaine") === "weekend" ? "Weekend" : "Semaine";
  const firstSpec = (row.specialites || [])[0];
  const headerProg = firstSpec ? `${labelSpec(firstSpec)} / ${programmeText}` : programmeText;

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full max-w-6xl mx-auto px-4 py-6 text-pink-700">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/admin/inscriptions" className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">
            ← Retour à la liste
          </Link>
          <span className="text-sm text-pink-500 truncate">ID: {row.id}</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">Dossier étudiant</h1>
        <p className="text-pink-600/80 mb-6">Créé le {fmtDateTimeFr(row.created_at)}</p>

        {/* ========== FORM ÉDITION ========== */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Field label="Nom">
            <input value={nom} onChange={(e) => setNom(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300" />
          </Field>
          <Field label="Téléphone">
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300" />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300" />
          </Field>
          <Field label="Naissance (JJ/MM/AAAA)">
            <input
              value={dateFr}
              onChange={(e) => setDateFr(e.target.value)}
              placeholder="JJ/MM/AAAA"
              className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300"
            />
          </Field>
          <Field label="Responsable">
            <input value={responsableNom} onChange={(e) => setResponsableNom(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300" />
          </Field>
          <Field label="Tél. responsable">
            <input value={responsableTel} onChange={(e) => setResponsableTel(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300" />
          </Field>
        </div>

        {/* Programme & Spécialités */}
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-pink-200 p-3">
            <div className="text-xs text-pink-500 mb-2">Option de formation</div>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="programme" checked={programme === "semaine"} onChange={() => setProgramme("semaine")} />
                <span>Semaine</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="programme" checked={programme === "weekend"} onChange={() => setProgramme("weekend")} />
                <span>Weekend</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-pink-200 p-3">
            <div className="text-xs text-pink-500 mb-2">Programmes (peut-être multiples)</div>
            <div className="grid grid-cols-1 gap-2">
              {SPECIALITES.map(opt => (
                <label key={opt.value} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={specs.includes(opt.value)}
                    onChange={(e) =>
                      setSpecs((prev) =>
                        e.currentTarget.checked
                          ? Array.from(new Set([...prev, opt.value]))
                          : prev.filter((v) => v !== opt.value)
                      )
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-10">
          <button
            onClick={save}
            disabled={saving}
            className="bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer la fiche"}
          </button>
          {err && <span className="ml-3 text-pink-700">{err}</span>}
        </div>

        {/* ========== NOTES (optionnel) ========== */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoute des remarques (paiement, présence, etc.)"
            className="w-full min-h-[120px] rounded-xl border border-pink-300 px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300"
          />
          <div className="mt-3">
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="border border-pink-300 text-pink-600 px-4 py-2 rounded-xl hover:bg-pink-50 disabled:opacity-60"
            >
              {savingNotes ? "Enregistrement…" : "Enregistrer les notes"}
            </button>
          </div>
        </div>

        {/* ========== CASIER PHOTOS ========== */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Casier photos</h2>
          <label className="inline-flex items-center gap-2 border border-pink-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-pink-50">
            <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
            {uploading ? "Upload…" : "Ajouter des photos"}
          </label>

          {photos.length === 0 ? (
            <p className="mt-3 text-pink-600/80">Aucune photo pour le moment.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div key={p.path} className="rounded-xl border border-pink-200 overflow-hidden">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.name} className="w-full h-40 object-cover" />
                  </a>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs truncate">{p.name}</span>
                    <button
                      onClick={() => removePhoto(p)}
                      className="text-pink-600 border border-pink-300 text-xs px-2 py-1 rounded-lg hover:bg-pink-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-pink-200 p-3">
      <div className="text-xs text-pink-500 mb-1">{label}</div>
      {children}
    </div>
  );
}
