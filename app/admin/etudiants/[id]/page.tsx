"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// =================== Constantes & helpers ===================

const BUCKET = "dossiers";
const SPECIALITES = ["maquillage", "cosmetologie", "decoration"] as const;
type TSPECIALITE = (typeof SPECIALITES)[number];

type StatutEtudiant = "actif" | "archive";

function labelSpec(s: string) {
  switch ((s || "").toLowerCase()) {
    case "maquillage":
      return "Maquillage";
    case "cosmetologie":
      return "Cosmétologie";
    case "decoration":
      return "Décoration";
    default:
      return s;
  }
}

// 'semaine' | 'weekend' <-> 1 | 2  (pour contourner la contrainte DB si besoin)
function grpToTxt(v: any): "semaine" | "weekend" {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("week") || s === "2") return "weekend";
  return "semaine";
}
function grpToInt(v: any): 1 | 2 {
  return grpToTxt(v) === "weekend" ? 2 : 1;
}
function firstLetter(name?: string) {
  const s = (name || "").trim();
  return s ? s[0]!.toUpperCase() : "?" ;
}
type EtudiantRow = {
  id: string;
  created_at: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  responsable_nom: string | null;
  responsable_tel: string | null;
  programme: string | null;     // maquillage | cosmetologie | decoration
  specialites: string[] | null; // tableau de strings
  groupe: string | number | null; // 'semaine' | 'weekend' | 1 | 2
  statut: string | null;        // 'actif' | 'archive'
  storage_key: string | null;   // clé dossier pour la galerie
};

type ImgItem = { name: string; url: string };

export default function EtudiantDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [storageKey, setStorageKey] = useState<string>("");
  const [images, setImages] = useState<ImgItem[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const avatarRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    date_naissance: "", // 'YYYY-MM-DD'
    responsable_nom: "",
    responsable_tel: "",
    programme: "", // maquillage | cosmetologie | decoration
    specialites: [] as string[],
    groupe: "semaine" as "semaine" | "weekend" | number,
    statut: "actif" as StatutEtudiant,
  });

  // =================== Chargement ===================

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

async function load() {
  if (!id) return;
  setLoading(true);
  setErr(null);

  const { data, error } = await supabase
    .from("etudiants")
    .select(
      "id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, programme, specialites, groupe, statut, storage_key"
    )
    .eq("id", id)
    .maybeSingle<EtudiantRow>();

  if (error || !data) {
    setErr(error?.message || "Étudiant introuvable");
    setLoading(false);
    return;
  }

  // Normalisation des champs
  const dateIso = (data.date_naissance || "").slice(0, 10);
  const specs = Array.isArray(data.specialites) ? (data.specialites as string[]) : [];

  // priorité à programme, sinon specialites[0]
  const programmeVal = (data.programme || specs[0] || "") as string;

  setForm({
    nom: data.nom || "",
    email: data.email || "",
    telephone: data.telephone || "",
    date_naissance: dateIso,
    responsable_nom: data.responsable_nom || "",
    responsable_tel: data.responsable_tel || "",
    programme: programmeVal,
    specialites: programmeVal ? [programmeVal] : [],
    groupe: grpToTxt(data.groupe),
    statut: (data.statut as StatutEtudiant) || "actif",
  });

  const sk = data.storage_key || data.id; // fallback: id
  setStorageKey(sk);

  // Assure une storage_key persistée
  if (!data.storage_key) {
    await supabase.from("etudiants").update({ storage_key: sk }).eq("id", id);
  }

  await loadImages(sk);
  await loadAvatar(sk);

  setLoading(false); // ✅ IMPORTANT
} // ← ✅ ferme bien la fonction


  // =================== Galerie ===================

  async function loadImages(sk = storageKey) {
    if (!sk) return;
    const { data: list, error } = await supabase.storage
      .from(BUCKET)
      .list(sk, { limit: 200, sortBy: { column: "name", order: "asc" } });

    if (error) return; // silencieux
    const items = (list || []).map((f) => {
      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${sk}/${f.name}`);
      return { name: f.name, url: data.publicUrl } as ImgItem;
    });
    setImages(items);
  }
async function loadAvatar(sk = storageKey) {
  if (!sk) return;
  // On cherche un fichier nommé _avatar.* prioritaire, sinon on prend la 1re image du dossier.
  const { data: list, error } = await supabase.storage
    .from(BUCKET)
    .list(sk, { limit: 200, sortBy: { column: "name", order: "asc" } });

  if (error) return;

  const prefer = (list || []).find(f =>
    /^_avatar\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name)
  );
  const pick = prefer || (list || []).find(f => /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name));
  if (!pick) { setAvatarUrl(null); return; }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${sk}/${pick.name}`);
  // cache-busting
  setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
}
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !storageKey) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${storageKey}/${fileName}`, file, {
          upsert: false,
          cacheControl: "3600",
        });

      if (error) {
        alert(error.message);
        break;
      }
    }

    // reset input
    if (fileRef.current) fileRef.current.value = "";
    await loadImages();
  }
async function onChangeAvatar(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file || !storageKey) return;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${storageKey}/_avatar.${ext}`;

  // upsert = true -> remplace l’ancienne
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) { alert(error.message); return; }

  if (avatarRef.current) avatarRef.current.value = "";
  await loadAvatar();
}
  async function deleteImage(name: string) {
    if (!storageKey) return;
    const ok = window.confirm("Supprimer cette image ?");
    if (!ok) return;
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${storageKey}/${name}`]);
    if (error) return alert(error.message);
    await loadImages();
   

  }

  // =================== Sauvegarde (robuste) ===================

  async function onSave() {
    if (saving) return;
    setSaving(true);
    setErr(null);

    try {
      // Payload avec groupe en TEXTE
     const payload1 = {
  nom: form.nom || null,
  email: form.email || null,
  telephone: form.telephone || null,
  date_naissance: form.date_naissance || null,
  responsable_nom: form.responsable_nom || null,
  responsable_tel: form.responsable_tel || null,
  programme: form.programme || null,
  specialites: form.programme ? [form.programme] : null, // ✅ synchro
  statut: form.statut || null,
  groupe: grpToTxt(form.groupe), // ← texte d'abord
};


      let { error } = await supabase
        .from("etudiants")
        .update(payload1)
        .eq("id", id);

      // Si la contrainte exige un entier, on retente
      if (error) {
        const payload2 = { ...payload1, groupe: grpToInt(form.groupe) };
        const { error: e2 } = await supabase
          .from("etudiants")
          .update(payload2)
          .eq("id", id);
        if (e2) return alert(e2.message);
      }

      alert("Modifications enregistrées ✅");
      // Optionnel: recharger pour refléter la DB
      await load();
    } catch (e: any) {
      alert(e?.message || "Erreur lors de l’enregistrement");
    } finally {
      setSaving(false);
    }
  }

  // =================== UI ===================

  const createdAt = useMemo(() => {
    return form && id ? undefined : undefined;
  }, [form, id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="px-4 sm:px-6 py-6 text-pink-700">
          <Link
            href="/admin/etudiants"
            className="text-pink-500 hover:underline inline-block mb-4"
          >
            ← Retour
          </Link>
          <p>Chargement…</p>
        </section>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-white">
        <section className="px-4 sm:px-6 py-6 text-pink-700">
          <Link
            href="/admin/etudiants"
            className="text-pink-500 hover:underline inline-block mb-4"
          >
            ← Retour
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {err}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="px-4 sm:px-6 py-6 text-pink-700">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/admin/etudiants"
            className="text-pink-500 hover:underline"
          >
            ← Retour à la liste
          </Link>
          <span className="text-xs text-pink-400">ID: {id}</span>
        </div>

        <h1 className="text-2xl font-bold text-pink-500 mb-6">Fiche étudiant</h1>
         {/* Avatar / Profil */}
<div className="mb-6 flex items-center gap-4">
  <div className="w-24 h-24 rounded-full border border-pink-300 flex items-center justify-center overflow-hidden bg-pink-50">
    {avatarUrl ? (
      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
    ) : (
      <span className="text-3xl font-semibold text-pink-500">
        {firstLetter(form.nom)}
      </span>
    )}
  </div>

  <div className="flex flex-col gap-2">
    <button
      onClick={() => avatarRef.current?.click()}
      className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50"
    >
      Changer la photo de profil
    </button>
    <input
      ref={avatarRef}
      type="file"
      accept="image/*"
      onChange={onChangeAvatar}
      className="hidden"
    />
    <p className="text-xs text-pink-400">
      L’image est enregistrée dans <code>{BUCKET}/{storageKey}/_avatar.*</code>
    </p>
  </div>
</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Téléphone</label>
            <input
              value={form.telephone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone: e.target.value }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Naissance</label>
            <input
              type="date"
              value={form.date_naissance}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_naissance: e.target.value }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Responsable</label>
            <input
              value={form.responsable_nom}
              onChange={(e) =>
                setForm((f) => ({ ...f, responsable_nom: e.target.value }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Tél. responsable</label>
            <input
              value={form.responsable_tel}
              onChange={(e) =>
                setForm((f) => ({ ...f, responsable_tel: e.target.value }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Programme</label>
            <select
  value={form.programme}
  onChange={(e) =>
    setForm((f) => ({
      ...f,
      programme: e.target.value as TSPECIALITE | "",
      specialites: e.target.value ? [e.target.value] : [],
    }))
  }
  className="w-full border border-pink-300 rounded-lg px-3 py-1.5"
>

              <option value="">—</option>
              <option value="maquillage">Maquillage</option>
              <option value="cosmetologie">Cosmétologie</option>
              <option value="decoration">Décoration</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Groupe</label>
            <div className="flex items-center gap-6 border border-pink-300 rounded-lg px-3 py-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="groupe"
                  checked={grpToTxt(form.groupe) === "semaine"}
                  onChange={() =>
                    setForm((f) => ({ ...f, groupe: "semaine" }))
                  }
                />
                Semaine
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="groupe"
                  checked={grpToTxt(form.groupe) === "weekend"}
                  onChange={() =>
                    setForm((f) => ({ ...f, groupe: "weekend" }))
                  }
                />
                Weekend
              </label>
            </div>
          </div>

        

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Statut</label>
            <select
              value={form.statut}
              onChange={(e) =>
                setForm((f) => ({ ...f, statut: e.target.value as StatutEtudiant }))
              }
              className="w-full border border-pink-300 rounded-lg px-3 py-1.5 max-w-xs"
            >
              <option value="actif">Actif</option>
              <option value="archive">Archivé</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link
            href="/admin/etudiants"
            className="border border-pink-300 text-pink-600 px-4 py-2 rounded-lg hover:bg-pink-50"
          >
            Retour à la liste
          </Link>
          <Link
  href="/admin/paiement-etudiant"
  className="px-3 py-1 text-xs rounded-lg bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
>
  💳 Voir paiements
</Link>

        </div>

        {/* =================== Galerie =================== */}
        <h2 className="text-lg font-semibold text-pink-500 mb-3">Galerie</h2>
        <div className="mb-3 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            onChange={onUpload}
            className="block"
          />
          <span className="text-sm text-pink-400">
            Dossier: <code>{storageKey || "—"}</code>
          </span>
        </div>

        {images.length === 0 ? (
          <p className="text-pink-400">Aucune photo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div
                key={img.name}
                className="border rounded-lg overflow-hidden group"
              >
                <a href={img.url} target="_blank" rel="noreferrer">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-40 object-cover"
                  />
                </a>
                <div className="flex items-center justify-between px-2 py-2 text-xs">
                  <span className="truncate">{img.name}</span>
                  <button
                    onClick={() => void deleteImage(img.name)}
                    className="text-pink-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}