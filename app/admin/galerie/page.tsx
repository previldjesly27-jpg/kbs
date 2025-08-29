"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type GalleryItem = {
  name: string;
  path: string;
  url: string;
  size?: number | null;
};

const CATEGORIES = [
  { label: "Maquillage", value: "maquillage" },
  { label: "Cosmetologie", value: "cosmetologie" },
  { label: "Decoration", value: "decoration" },
  { label: "Autres", value: "autres" },
];

export default function AdminGaleriePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const [currentCat, setCurrentCat] = useState<string>(CATEGORIES[0].value);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [workingPath, setWorkingPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // ---------- Guard admin via RPC is_admin ----------
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/admin/login?next=/admin/galerie"); return; }

      const { data: ok } = await supabase.rpc("is_admin");
      if (ok !== true) {
        await supabase.auth.signOut();
        router.replace("/admin/login?next=/admin/galerie");
        return;
      }

      setAuthChecked(true);
      await listCurrent(currentCat);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ---------- Listing ----------
  async function listCurrent(cat = currentCat) {
    setLoading(true);
    setErr(null);
    setMsg(null);

    const { data, error } = await supabase.storage
      .from("galerie")
      .list(cat, { limit: 100, sortBy: { column: "name", order: "desc" } });

    if (error) {
      setErr(`Liste: ${error.message}`);
      setItems([]);
      setLoading(false);
      return;
    }

    const arr: GalleryItem[] =
      (data ?? [])
        .filter((o: any) => o?.name)
        .map((o: any) => {
          const path = `${cat}/${o.name}`;
          const { data: pub } = supabase.storage.from("galerie").getPublicUrl(path);
          return { name: o.name, path, url: pub.publicUrl, size: o?.metadata?.size ?? null };
        });

    setItems(arr);
    setLoading(false);
  }

  // ---------- Upload (FormData + bouton) ----------
  async function doUpload(form: HTMLFormElement) {
    setErr(null);
    setMsg(null);
    setUploading(true);

    try {
      const fd = new FormData(form);
      const file = fd.get("file") as File | null;
      const categorie = String(fd.get("categorie") || currentCat).toLowerCase();

      if (!file || file.size === 0) {
        setErr("Choisissez une image valide.");
        setUploading(false);
        return;
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const base = file.name.replace(/\.[^/.]+$/, "").replace(/[^\w-]+/g, "-").toLowerCase();
      const path = `${categorie}/${Date.now()}_${base}.${ext}`;

      const { error } = await supabase.storage
        .from("galerie")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
        });

      if (error) {
        console.error("Upload error:", error);
        setErr(`Upload: ${error.message}`);
        setUploading(false);
        return;
      }

      setMsg("Image envoyée ✅");
      form.reset();
      setCurrentCat(categorie);
      await listCurrent(categorie);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Erreur inattendue");
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await doUpload(e.currentTarget);
  }

  // ---------- Delete ----------
  async function removeItem(p: string) {
    if (!confirm("Supprimer cette image ?")) return;
    setWorkingPath(p);
    setErr(null); setMsg(null);

    const { error } = await supabase.storage.from("galerie").remove([p]);
    if (error) { setErr(`Suppression: ${error.message}`); setWorkingPath(null); return; }

    setMsg("Image supprimée ✅");
    setWorkingPath(null);
    await listCurrent();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-white">
        <Navbar />
        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-pink-500">Vérification…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-pink-500">Galerie</h1>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition">← Dashboard</Link>
            <button onClick={handleLogout} className="bg-white text-pink-500 px-4 py-2 rounded-xl border hover:bg-gray-50 transition">Déconnexion</button>
          </div>
        </div>

        {/* Upload */}
        <form onSubmit={handleUploadSubmit} className="rounded-xl border p-4 mb-6">
          <p className="font-semibold text-pink-500 mb-3">Ajouter une image</p>
          <div className="grid gap-3 sm:grid-cols-[1fr,200px,140px]">
            <input
              id="file-input"
              name="file"                  // ✅ IMPORTANT
              type="file"
              accept="image/*"
              className="w-full border rounded-lg px-3 py-2"
            />
            <select
              id="cat-select"
              name="categorie"             // ✅ IMPORTANT
              defaultValue={currentCat}
              className="border rounded-lg px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={(e) => {
                const form = (e.currentTarget.form as HTMLFormElement) || document.querySelector("form");
                if (form) void doUpload(form);
              }}
              disabled={uploading}
              className="bg-pink-500 text-white px-4 py-2 rounded-xl hover:bg-pink-600 transition disabled:opacity-60"
            >
              {uploading ? "Envoi…" : "Envoyer"}
            </button>
          </div>
          <div className="mt-2 min-h-[1.25rem]">
            {err && <span className="text-red-600">{err}</span>}
            {msg && <span className="text-green-700">{msg}</span>}
          </div>
        </form>

        {/* Filtre catégorie */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-pink-500 font-semibold">Catégorie :</span>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCurrentCat(c.value); void listCurrent(c.value); }}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  currentCat === c.value
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-pink-500 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="rounded-xl border">
          <div className="px-4 py-3 border-b">
            <p className="font-semibold text-pink-500">
              Images ({currentCat}) {loading ? "• Chargement…" : `• ${items.length}`}
            </p>
          </div>

          {loading ? (
            <p className="p-4 text-pink-500">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-pink-500">Aucune image dans cette catégorie.</p>
          ) : (
            <ul className="p-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <li key={it.path} className="border rounded-lg overflow-hidden">
                  <img
                    src={it.url}
                    alt={it.name}
                    className="w-full h-48 object-cover bg-gray-100"
                  />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate" title={it.name}>
                      {it.name}
                    </span>
                    <button
                      onClick={() => removeItem(it.path)}
                      disabled={workingPath === it.path}
                      className="text-white bg-pink-500 px-3 py-1.5 rounded-lg hover:bg-pink-600 disabled:opacity-50"
                    >
                      {workingPath === it.path ? "…" : "Supprimer"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
