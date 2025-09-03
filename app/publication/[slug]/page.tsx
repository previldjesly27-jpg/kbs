// app/publication/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

// ✅ Crée le client au runtime (évite les plantages de build si ENV manquent)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env manquantes.");
  return createClient(url, key);
}

function formatDateFR(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ⚠️ Pas de typage strict sur props → évite le mismatch Next/TS
export async function generateMetadata(props: any) {
  const slug = decodeURIComponent(props?.params?.slug ?? "");
  if (!slug) return { title: "Publication | Kisa Beauty School" };

  const supabase = getSupabase();
  const { data: post } = await supabase
    .from("publication")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return {
    title: post?.title ? `${post.title} | Kisa Beauty School` : "Publication | Kisa Beauty School",
  };
}

export default async function PostPage(props: any) {
  const slug = decodeURIComponent(props?.params?.slug ?? "");
  const supabase = getSupabase();

  const { data: post, error } = await supabase
    .from("publication")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen bg-pink-50">
        <Navbar />
        <div className="max-w-3xl mx-auto p-6 text-red-600">Erreur chargement article.</div>
        <Footer />
      </main>
    );
  }
  if (!post) return notFound();

  return (
    <main className="min-h-screen bg-pink-50">
      <Navbar />
      <article className="max-w-3xl mx-auto p-6">
        <a href="/publication" className="text-pink-700 hover:underline">← Retour aux publications</a>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt=""
            className="block w-full h-auto max-h-[75vh] object-contain rounded-2xl mt-4 mb-6 border border-pink-100 bg-white"
          />
        )}

        <h1 className="text-3xl font-bold text-pink-700">{post.title}</h1>
        <div className="text-sm text-pink-700/70 mt-1 mb-6">
          {formatDateFR(post.created_at)}
        </div>

        <div className="prose max-w-none whitespace-pre-wrap text-pink-700">
          {post.content}
        </div>
      </article>
      <Footer />
    </main>
  );
}
