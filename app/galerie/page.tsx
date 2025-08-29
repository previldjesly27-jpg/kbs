"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";

const CATEGORIES = ["maquillage", "cosmetologie", "decoration", "autres"] as const;
type Cat = typeof CATEGORIES[number];
type Item = { name: string };

export default function GaleriePage() {
  const [cat, setCat] = useState<Cat>("maquillage");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Lightbox
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => { listCurrent(); }, [cat]);

  async function listCurrent() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.storage.from("galerie").list(cat, {
      limit: 200,
      sortBy: { column: "name", order: "desc" },
    });
    if (error) setErr(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  function openAt(i: number) {
    setCurrent(i);
    setIsOpen(true);
  }
  function prev() {
    setCurrent((i) => (i - 1 + items.length) % items.length);
  }
  function next() {
    setCurrent((i) => (i + 1) % items.length);
  }
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, items.length]);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold text-pink-500 text-center mb-8">Galerie</h1>

        {/* Filtres */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-xl border transition ${
                cat === c
                  ? "bg-pink-500 text-white border-pink-500"
                  : "bg-white text-pink-500 border-pink-300 hover:bg-pink-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {err && <p className="text-red-600 text-center mb-4">{err}</p>}

        {loading ? (
          <p className="text-pink-500 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-pink-500 text-center">Aucune image dans cette catégorie.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((it, i) => {
              const path = `${cat}/${it.name}`;
              const { data } = supabase.storage.from("galerie").getPublicUrl(path);
              const url = data.publicUrl;
              return (
                <li key={it.name} className="rounded-xl border overflow-hidden">
                  <img
                    src={`${url}?width=900&quality=80`}
                    alt={it.name}
                    className="w-full h-56 object-cover cursor-zoom-in"
                    loading="lazy"
                    onClick={() => openAt(i)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Lightbox */}
      {isOpen && items[current] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            {(() => {
              const path = `${cat}/${items[current].name}`;
              const { data } = supabase.storage.from("galerie").getPublicUrl(path);
              const url = data.publicUrl;
              return (
                <img
                  src={`${url}?width=1600&quality=85`}
                  alt={items[current].name}
                  className="w-full max-h-[80vh] object-contain rounded-xl"
                />
              );
            })()}

            {/* Controls */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 bg-white/90 text-pink-600 rounded-full px-3 py-1 text-sm font-semibold hover:bg-white"
              aria-label="Fermer"
            >
              ✕ Fermer
            </button>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 text-pink-600 rounded-full px-3 py-2 hover:bg-white"
              aria-label="Précédent"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 text-pink-600 rounded-full px-3 py-2 hover:bg-white"
              aria-label="Suivant"
            >
              ›
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 text-white text-sm">
              {current + 1} / {items.length}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
