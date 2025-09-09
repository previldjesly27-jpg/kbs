"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "dossiers"; // bucket unique partagé

type Statut = "actif" | "termine" | "suspendu";
type Filiere = "maquillage" | "cosmetologie" | "decoration";
type Groupe = "semaine" | "weekend";

type Row = {
  id: string;
  created_at: string;
  storage_key: string | null;     // <— clé dossier partagé
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  responsable_nom: string | null;
  responsable_tel: string | null;
  filiere: Filiere | null;
  groupe: Groupe | null;
  statut: Statut | null;
  avatar_url: string | null;
  notes: string | null;
};

type Photo = { name: string; path: string; url: string };

const FILIERES: { value: Filiere; label: string }[] = [
  { value: "maquillage",   label: "Maquillage" },
  { value: "cosmetologie", label: "Cosmétologie" },
  { value: "decoration",   label: "Décoration" },
];

const fmtDateTimeFr = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR") : "—");

function toFrFromIso(iso?: string | null) {
  if (!iso) return "";
  const s = iso.includes("T") ? iso.slice(0,10) : iso;
  const [y,m,d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
function toIsoFromFr(fr: string) {
  const m = fr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const D = new Date(+yyyy, +mm - 1, +dd);
  if (D.getFullYear()!==+yyyy || D.getMonth()!==+mm-1 || D.getDate()!==+dd) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export default function EtudiantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [dateFr, setDateFr] = useState("");
  const [responsableNom, setResponsableNom] = useState("");
  const [responsableTel, setResponsableTel] = useState("");
  const [filiere, setFiliere] = useState<Filiere>("maquillage");
  const [groupe, setGroupe] = useState<Groupe>("semaine");
  const [statut, setStatut] = useState<Statut>("actif");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // avatar + galerie
  const [avatar, setAvatar] = useState<string | null>(null);
  const [upAvatar, setUpAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase.from("etudiants").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setErr(error?.message || "Introuvable"); setLoading(false); return; }
      const r = data as Row;
      setRow(r);

      setNom(r.nom || ""); setEmail(r.email || ""); setTelephone(r.telephone || "");
      setDateFr(toFrFromIso(r.date_naissance));
      setResponsableNom(r.responsable_nom || ""); setResponsableTel(r.responsable_tel || "");
      setFiliere((r.filiere as Filiere) || "maquillage");
      setGroupe((r.groupe as Groupe) || "semaine");
      setStatut((r.statut as Statut) || "actif");
      setNotes(r.notes || "");
      setAvatar(r.avatar_url || null);

      await loadPhotos(r.storage_key || r.id);
      setLoading(false);
    })();
  }, [id]);

  async function loadPhotos(key: string) {
    const { data: listed, error } = await supabase.storage.from(BUCKET).list(key, {
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });
    if (error) { console.error(error); setPhotos([]); return; }

    const items = (listed || []).map(f => {
      const path = `${key}/${f.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { name: f.name, path, url: data.publicUrl };
    });
    setPhotos(items);
  }

  async function save() {
    if (!row) return;
    setSaving(true); setErr(null);
    const iso = dateFr ? toIsoFromFr(dateFr) : null;
    if (dateFr && !iso) { setErr("Date invalide (JJ/MM/AAAA)"); setSaving(false); return; }

    const payload = {
      nom: nom.trim(),
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      date_naissance: iso,
      responsable_nom: responsableNom.trim() || null,
      responsable_tel: responsableTel.trim() || null,
      filiere, groupe, statut,
    };

    const { error } = await supabase.from("etudiants").update(payload).eq("id", row.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setRow({ ...(row as Row), ...payload });
    alert("Fiche enregistrée ✅");
  }

  async function saveNotes() {
    if (!row) return;
    setSavingNotes(true);
    const { error } = await supabase.from("etudiants").update({ notes: notes || null }).eq("id", row.id);
    setSavingNotes(false);
    if (error) return alert(error.message);
    alert("Notes enregistrées ✅");
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!row) return;
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    setUpAvatar(true);
    const key = row.storage_key || row.id;
    try {
      const safe = file.name.replace(/\s+/g, "_");
      const path = `${key}/avatar-${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;
      const { error: e2 } = await supabase.from("etudiants").update({ avatar_url: url }).eq("id", row.id);
      if (e2) throw e2;
      setAvatar(url);
      setRow(prev => prev ? { ...prev, avatar_url: url } : prev);
      await loadPhotos(key);
    } catch (err: any) {
      alert(err?.message || "Échec de l’upload avatar");
    } finally {
      setUpAvatar(false);
      try { inputEl.value = ""; } catch {}
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!row) return;
    const inputEl = e.currentTarget;
    const files = inputEl.files ? Array.from(inputEl.files) : [];
    if (!files.length) return;
    setUploading(true);
    const key = row.storage_key || row.id;
    try {
      for (const file of files) {
        const safe = file.name.replace(/\s+/g, "_");
        const path = `${key}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (error) throw error;
      }
      await loadPhotos(key);
    } catch (err: any) {
      alert(err?.message || "Échec de l’upload");
    } finally {
      setUploading(false);
      try { inputEl.value = ""; } catch {}
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto(p: Photo) {
    if (!row) return;
    if (!confirm("Supprimer cette photo ?")) return;
    const { error } = await supabase.storage.from(BUCKET).remove([p.path]);
    if (error) return alert(error.message);
    setPhotos(prev => prev.filter(x => x.path !== p.path));
  }

  if (!id) return <main className="min-h-screen p-6 text-pink-700">ID manquant.</main>;
  if (loading) return <main className="min-h-screen p-6 text-pink-700">Chargement…</main>;
  if (err || !row) return <main className="min-h-screen p-6 text-pink-700">Erreur : {err || "Introuvable"}</main>;

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full max-w-6xl mx-auto px-4 py-6 text-pink-700">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/admin/etudiants" className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">← Retour</Link>
          <span className="text-sm text-pink-500 truncate">ID: {row.id}</span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-20 w-20 rounded-full overflow-hidden border border-pink-200 bg-pink-50 flex items-center justify-center">
            {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover"/> : <span className="text-pink-400 text-sm">Aucun</span>}
          </div>
          <label className="inline-flex items-center gap-2 border border-pink-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-pink-50">
            <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden"/>
            {upAvatar ? "Upload…" : "Changer la photo de profil"}
          </label>
        </div>

        <h1 className="text-2xl font-bold mb-1">{row.nom}</h1>
        <p className="text-pink-600/80 mb-6">Créé le {fmtDateTimeFr(row.created_at)}</p>

        {/* Form */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Field label="Nom"><input value={nom} onChange={(e)=>setNom(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
          <Field label="Téléphone"><input value={telephone} onChange={(e)=>setTelephone(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
          <Field label="Naissance (JJ/MM/AAAA)"><input value={dateFr} onChange={(e)=>setDateFr(e.target.value)} placeholder="JJ/MM/AAAA" className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
          <Field label="Responsable"><input value={responsableNom} onChange={(e)=>setResponsableNom(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
          <Field label="Tél. responsable"><input value={responsableTel} onChange={(e)=>setResponsableTel(e.target.value)} className="w-full border border-pink-300 rounded-xl px-3 py-2"/></Field>
        </div>

        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-pink-200 p-3">
            <div className="text-xs text-pink-500 mb-2">Programme</div>
            <select value={filiere} onChange={(e)=>setFiliere(e.target.value as Filiere)} className="border border-pink-300 rounded-xl px-3 py-2">
              {FILIERES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-pink-200 p-3">
            <div className="text-xs text-pink-500 mb-2">Groupe</div>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2"><input type="radio" name="groupe" checked={groupe==="semaine"} onChange={()=>setGroupe("semaine")}/><span>Semaine</span></label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="groupe" checked={groupe==="weekend"} onChange={()=>setGroupe("weekend")}/><span>Weekend</span></label>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-pink-200 p-3">
          <div className="text-xs text-pink-500 mb-2">Statut</div>
          <select value={statut} onChange={(e)=>setStatut(e.target.value as Statut)} className="border border-pink-300 rounded-xl px-3 py-2">
            <option value="actif">Actif</option>
            <option value="termine">Terminé</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </div>

        <div className="mb-10">
          <button onClick={save} disabled={saving} className="bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 disabled:opacity-60">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {err && <span className="ml-3 text-pink-700">{err}</span>}
        </div>

        {/* Notes */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Notes</h2>
          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full min-h-[120px] rounded-xl border border-pink-300 px-3 py-2" placeholder="Remarques, paiements, présence…"/>
          <div className="mt-3">
            <button onClick={saveNotes} disabled={savingNotes} className="border border-pink-300 text-pink-600 px-4 py-2 rounded-xl hover:bg-pink-50 disabled:opacity-60">
              {savingNotes ? "Enregistrement…" : "Enregistrer les notes"}
            </button>
          </div>
        </div>

        {/* Galerie */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Galerie</h2>
          <label className="inline-flex items-center gap-2 border border-pink-300 rounded-xl px-3 py-2 cursor-pointer hover:bg-pink-50">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onUpload} className="hidden"/>
            {uploading ? "Upload…" : "Ajouter des photos"}
          </label>

          {photos.length === 0 ? (
            <p className="mt-3 text-pink-600/80">Aucune photo pour le moment.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div key={p.path} className="rounded-xl border border-pink-200 overflow-hidden">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={p.name} className="w-full h-40 object-cover"/>
                  </a>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-xs truncate">{p.name}</span>
                    <button onClick={()=>removePhoto(p)} className="text-pink-600 border border-pink-300 text-xs px-2 py-1 rounded-lg hover:bg-pink-50">Supprimer</button>
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
