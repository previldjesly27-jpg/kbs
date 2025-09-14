"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Cat = "maquillage" | "cosmetologie" | "decoration";

const BUCKET = "galerie"; // ← adapte si besoin

const LABELS: Record<Cat, string> = {
  maquillage: "Maquillage",
  cosmetologie: "Cosmétologie",
  decoration: "Décoration",
};

type Item = { url: string; name: string };

function useCatImages(cat: Cat) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(cat, { limit: 200, sortBy: { column: "name", order: "desc" } });
      if (!mounted) return;
      if (error) { setItems([]); setLoading(false); return; }
      const list =
        (data || [])
          .filter(f => /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name))
          .map(f => {
            const path = `${cat}/${f.name}`;
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
            return { url: data.publicUrl, name: f.name };
          });
      setItems(list);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [cat]);

  return { items, loading };
}

function TileSlider({ images, label }: { images: string[]; label: string }) {
  // on garde toujours 2 panneaux : current + next
  const [idx, setIdx] = useState(0);
  const [sliding, setSliding] = useState(false);
  const has = images.length > 0;
  const current = images[idx % (images.length || 1)] || "";
  const next = images[(idx + 1) % (images.length || 1)] || current;

  useEffect(() => {
    if (!has) return;
    const t = setInterval(() => {
      setSliding(true);
      // durée = 700ms (cf. className)
      const end = setTimeout(() => {
        setSliding(false);
        setIdx(i => (i + 1) % images.length);
      }, 720);
      return () => clearTimeout(end);
    }, 15000); // 15s
    return () => clearInterval(t);
  }, [images, has]);

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-pink-200 bg-pink-50">
      {/* Piste 200% : 2 panneaux */}
      <div
        className={[
          "flex h-full w-[200%] transition-transform duration-700",
          sliding ? "-translate-x-1/2" : "translate-x-0",
        ].join(" ")}
      >
        <img src={current} alt="" className="w-1/2 h-full object-cover" />
        <img src={next} alt="" className="w-1/2 h-full object-cover" />
      </div>

      {/* overlay & label */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      <div className="absolute left-3 bottom-3 px-2.5 py-1.5 rounded-md bg-black/55 text-white text-sm font-semibold">
        {label}
      </div>
    </div>
  );
}

export default function HomeTriptych() {
  const { items: m, loading: lm } = useCatImages("maquillage");
  const { items: c, loading: lc } = useCatImages("cosmetologie");
  const { items: d, loading: ld } = useCatImages("decoration");

  // URLs uniquement
  const maquillage = useMemo(() => m.map(i => i.url), [m]);
  const cosmetologie = useMemo(() => c.map(i => i.url), [c]);
  const decoration = useMemo(() => d.map(i => i.url), [d]);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-5">
      
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          {lm && <Skeleton />}
          {!lm && maquillage.length > 0 && (
            <TileSlider images={maquillage} label={LABELS.maquillage} />
          )}
          {!lm && maquillage.length === 0 && <Empty label={LABELS.maquillage} />}
        </div>

        <div>
          {lc && <Skeleton />}
          {!lc && cosmetologie.length > 0 && (
            <TileSlider images={cosmetologie} label={LABELS.cosmetologie} />
          )}
          {!lc && cosmetologie.length === 0 && <Empty label={LABELS.cosmetologie} />}
        </div>

        <div>
          {ld && <Skeleton />}
          {!ld && decoration.length > 0 && (
            <TileSlider images={decoration} label={LABELS.decoration} />
          )}
          {!ld && decoration.length === 0 && <Empty label={LABELS.decoration} />}
        </div>
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="w-full aspect-square animate-pulse rounded-2xl bg-pink-100 border border-pink-200" />
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="w-full aspect-square rounded-2xl border border-dashed border-pink-300 flex items-center justify-center text-pink-500">
      Pas d’images • {label}
    </div>
  );
}
