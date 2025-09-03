// app/admin/publications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_url: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
};

export default function AdminPublicationsPage() {
  // Gate admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingGate, setLoadingGate] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [file, setFile] = useState<File | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(null);

  // Lists
  const [posts, setPosts] = useState<Post[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ── Gate admin (insensible à la casse)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() ?? null;
      if (!email) { setIsAdmin(false); setLoadingGate(false); return; }

      const { data } = await supabase
        .from("kbs_admins")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      setIsAdmin(!!data);
      setLoadingGate(false);
    })();
  }, []);

  async function loadData() {
    const { data: p } = await supabase
      .from("publication")
      .select("id, title, slug, content, cover_url, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    setPosts((p as Post[]) || []);

    const { data: n } = await supabase
      .from("admin_note")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotes((n as Note[]) || []);
  }

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  function toSlug(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleUpload(): Promise<string | null> {
    if (!file) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("publications").upload(path, file, { upsert: false });
    if (error) { setErr("Upload image échoué"); return null; }
    const { data } = supabase.storage.from("publications").getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setContent("");
    setStatus("published");
    setFile(null);
    setExistingCover(null);
    setErr(null);
    setMsg(null);
  }

  function startEdit(p: Post) {
    setEditingId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setContent(p.content);
    setStatus(p.status);
    setExistingCover(p.cover_url);
    setFile(null);
    setMsg(null);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePost() {
    setSaving(true); setErr(null); setMsg(null);
    try {
      const finalSlug = (slug ? toSlug(slug) : toSlug(title)).trim();
      if (!title.trim() || !content.trim() || !finalSlug) {
        throw new Error("Complète Titre, Contenu et Slug.");
      }
      const uploadedCover = await handleUpload();
      const cover = uploadedCover ?? existingCover ?? null;
      const { data: { user } } = await supabase.auth.getUser();

      if (editingId) {
        const { error } = await supabase
          .from("publication")
          .update({ title, slug: finalSlug, content, cover_url: cover, status })
          .eq("id", editingId);
        if (error) throw error;
        setMsg("Article modifié ✅");
      } else {
        const { error } = await supabase.from("publication").insert({
          title, slug: finalSlug, content, cover_url: cover, status, author_id: user?.id ?? null
        });
        if (error) throw error;
        setMsg("Article enregistré ✅");
      }

      await loadData();
      resetForm();
    } catch (e: any) {
      setErr(e?.message || "Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await supabase.from("publication").delete().eq("id", id);
    if (error) { setErr("Suppression échouée"); return; }
    await loadData();
    if (editingId === id) resetForm();
  }

  async function toggleStatus(p: Post) {
    const next = p.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("publication").update({ status: next }).eq("id", p.id);
    if (!error) { await loadData(); }
  }

  async function addNote(formData: FormData) {
    const text = String(formData.get("note") || "").trim();
    if (!text) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_note").insert({ content: text, author_id: user?.id ?? null });
    if (!error) {
      (document.getElementById("note-form") as HTMLFormElement)?.reset();
      await loadData();
    }
  }

  async function copyLink(p: Post) {
    if (p.status !== "published") return;
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kisabeautyschool.education";
    const url = `${base}/publication/${p.slug}`;
    try { await navigator.clipboard.writeText(url); setMsg("Lien copié ✅"); setTimeout(()=>setMsg(null), 2000); }
    catch { setErr("Impossible de copier le lien"); setTimeout(()=>setErr(null), 2000); }
  }

  // ── UI Rose (texte global rose) ─────────────────────────────────────────────
  if (loadingGate) return <div className="min-h-screen bg-pink-50 dark:bg-pink-50 p-6 text-pink-700">Vérification…</div>;
  if (!isAdmin) return <div className="min-h-screen bg-pink-50 dark:bg-pink-50 p-6 text-pink-700">Accès refusé (admin requis).</div>;

  return (
    
    <div className="min-h-screen bg-pink-50 dark:bg-pink-50 text-pink-700">
      <div className="max-w-6xl mx-auto p-6">
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold text-pink-700">Admin — Publications</h1>
  <Link
    href="/admin"
    className="inline-flex items-center gap-2 rounded-xl border border-pink-300 text-pink-700 px-3 py-2 hover:bg-pink-50"
  >
    ← Retour au dashboard
  </Link>
</div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold mb-3">{editingId ? "Modifier l’article" : "Nouvelle publication"}</h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="text-sm px-3 py-1 rounded-xl border border-pink-200 hover:bg-pink-50"
                title="Annuler l’édition"
              >
                Annuler
              </button>
            )}
          </div>

          {msg && <div className="mb-3">✅ {msg}</div>}
          {err && <div className="mb-3 text-red-600">❌ {err}</div>}

          <label className="block text-sm font-medium mb-1">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl px-3 py-2 mb-3 outline-none text-pink-700 placeholder-pink-300"
            placeholder="Ex: Cérémonie de graduation 2025"
          />

          <label className="block text-sm font-medium mb-1">Slug (URL)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl px-3 py-2 mb-3 outline-none text-pink-700 placeholder-pink-300"
            placeholder="ex: graduation-2025"
          />

          <label className="block text-sm font-medium mb-1">Contenu</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl px-3 py-2 mb-3 min-h-[160px] outline-none text-pink-700 placeholder-pink-300"
            placeholder="Texte de l'article…"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Image de couverture</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mb-2 text-pink-700 file:mr-3 file:rounded-lg file:border file:border-pink-200 file:px-3 file:py-1 file:text-pink-700 file:bg-white hover:file:bg-pink-50"
              />
              {existingCover && !file && (
                <div className="text-xs break-all">
                  Actuelle: {existingCover}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl px-3 py-2 outline-none bg-white text-pink-700"
              >
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={savePost}
              disabled={saving}
              className="bg-white text-pink-700 border border-pink-300 rounded-xl px-4 py-2 hover:bg-pink-50 disabled:opacity-60"
            >
              {saving ? (editingId ? "Enregistrement…" : "Publication…") : (editingId ? "Enregistrer les modifications" : "Publier")}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-xl px-4 py-2 border border-pink-200 hover:bg-pink-50"
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {/* Articles */}
            <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4">
              <h2 className="font-semibold mb-3">Articles</h2>
              <div className="divide-y">
                {posts.map((p) => (
                  <div key={p.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{p.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            p.status === "published"
                              ? "bg-pink-50 border-pink-200"
                              : "bg-white border-pink-200"
                          }`}
                        >
                          {p.status === "published" ? "Publié" : "Brouillon"}
                        </span>
                      </div>
                      <div className="text-sm break-all">
                        /publication/{p.slug} · Créé: {new Date(p.created_at).toLocaleString("fr-FR")}
                        {p.updated_at && <> · Modifié: {new Date(p.updated_at).toLocaleString("fr-FR")}</>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(p)} className="hover:underline">Modifier</button>
                      <button onClick={() => toggleStatus(p)} className="hover:underline">
                        {p.status === "published" ? "Mettre en brouillon" : "Publier"}
                      </button>
                      {p.status === "published" && (
                        <button onClick={() => copyLink(p)} className="hover:underline">Copier le lien</button>
                      )}
                      <button onClick={() => deletePost(p.id)} className="hover:underline">Supprimer</button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div>Aucun article pour l’instant.</div>
                )}
              </div>
            </div>
          </div>

          {/* Notes internes */}
          <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4">
            <h2 className="font-semibold mb-3">Notes internes</h2>
            <form id="note-form" action={addNote} className="mb-3">
              <textarea
                name="note"
                className="w-full border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-200 rounded-xl px-3 py-2 mb-2 min-h-[90px] outline-none text-pink-700 placeholder-pink-300"
                placeholder="Note rapide pour l'équipe admin…"
              />
              <button className="rounded-xl px-3 py-2 border border-pink-300 hover:bg-pink-50">
                Ajouter la note
              </button>
            </form>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {notes.map((n) => (
                <div key={n.id} className="border border-pink-100 rounded-xl p-3">
                  <div className="text-sm mb-1">
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </div>
                  <div className="whitespace-pre-wrap">{n.content}</div>
                </div>
              ))}
              {notes.length === 0 && <div>Aucune note.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
