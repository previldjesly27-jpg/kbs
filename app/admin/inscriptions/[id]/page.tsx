"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "dossiers";

type Row = {
  id: string;
  created_at: string;
  storage_key: string | null;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  responsable_nom: string | null;
  responsable_tel: string | null;
  programme: "semaine" | "weekend" | null; // horaire
  specialites: string[] | null;            // ex: ["maquillage"]
  notes: string | null;
};

type Photo = { name: string; path: string; url: string };

const fmtDateTimeFr = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR") : "—");

export default function InscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase.from("inscriptions").select("*").eq("id", id).maybeSingle();
      if (error || !data) { setErr(error?.message || "Introuvable"); setLoading(false); return; }
      const r = data as Row;
      setRow(r);
      setNotes(r.notes || "");
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

  async function saveNotes() {
    if (!row) return;
    setSavingNotes(true);
    const { error } = await supabase.from("inscriptions").update({ notes: notes || null }).eq("id", row.id);
    setSavingNotes(false);
    if (error) return alert(error.message);
    alert("Notes enregistrées ✅");
  }

  if (!id) return <main className="min-h-screen p-6 text-pink-700">ID manquant.</main>;
  if (loading) return <main className="min-h-screen p-6 text-pink-700">Chargement…</main>;
  if (err || !row) return <main className="min-h-screen p-6 text-pink-700">Erreur : {err || "Introuvable"}</main>;

  const progLabel = (row.programme || "semaine").toLowerCase() === "weekend" ? "Weekend" : "Semaine";
  const filiere = (row.specialites?.[0] || "").toLowerCase();

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full max-w-6xl mx-auto px-4 py-6 text-pink-700">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/admin/inscriptions" className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">← Retour</Link>
          <span className="text-sm text-pink-500 truncate">ID: {row.id}</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">{row.nom}</h1>
        <p className="text-pink-600/80 mb-6">
          Créé le {fmtDateTimeFr(row.created_at)} • Programme: {filiere ? filiere[0].toUpperCase()+filiere.slice(1) : "—"} / {progLabel}
        </p>

        {/* Notes */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Notes</h2>
          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full min-h-[120px] rounded-xl border border-pink-300 px-3 py-2" placeholder="Remarques…"/>
          <div className="mt-3">
            <button onClick={saveNotes} disabled={savingNotes} className="border border-pink-300 text-pink-600 px-4 py-2 rounded-xl hover:bg-pink-50 disabled:opacity-60">
              {savingNotes ? "Enregistrement…" : "Enregistrer les notes"}
            </button>
          </div>
        </div>

        {/* Galerie (partagée avec Étudiant) */}
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
