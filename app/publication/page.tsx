// app/publication/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

// ✅ crée le client au runtime (évite les plantages de build si ENV manquantes)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env manquantes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }
  return createClient(url, key);
}

function formatDateFR(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function excerpt(txt: string, n = 140) {
  const clean = txt.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n) + "…" : clean;
}

export default async function PublicationPage() {
  const supabase = getSupabase();
  const { data: posts, error } = await supabase
    .from("publication")
    .select("id, slug, title, cover_url, created_at, content")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-pink-50">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 text-red-600">
          Erreur chargement publications.
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pink-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-pink-500 text-center mb-1">
            Magazine
          </h1>
          <p className="text-xl font-semibold text-pink-600 italic mb-6 text-center">
            Bienvenue dans notre magazine en ligne. Reportages, avant/après, tendances, astuces pro et moments forts de la vie de l’école… Suis nos réalisations et les réussites de nos Kisa Girls & Boys — “Kisa un jour, Kisa toujours”.
          </p>
        </header>

        {!posts?.length && (
          <div className="text-pink-700/80">Aucun article pour le moment.</div>
        )}

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts?.map((p) => (
            <Link
              key={p.id}
              href={`/publication/${p.slug}`}
              className="block bg-white rounded-2xl border border-pink-100 hover:shadow-md transition"
            >
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_url}
                  alt=""
                  className="w-full h-44 object-cover rounded-t-2xl"
                />
              )}
              <div className="p-4">
                <h2 className="font-semibold text-pink-700">{p.title}</h2>
                <div className="text-sm text-pink-700/70 mt-0.5">
                  {formatDateFR(p.created_at)}
                </div>
                {p.content && (
                  <p className="text-pink-700/80 mt-2 text-sm">{excerpt(p.content)}</p>
                )}
                <span className="inline-block mt-3 text-sm text-pink-700 hover:underline">
                  Lire l’article →
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
      <Footer />
    </main>
  );
}
