// app/publication/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatDateFR(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: post } = await supabase
    .from("publication")
    .select("title")
    .eq("slug", decodeURIComponent(params.slug))
    .eq("status", "published")
    .maybeSingle();

  return {
    title: post?.title ? `${post.title} | Kisa Beauty School` : "Publication | Kisa Beauty School",
  };
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const { data: post, error } = await supabase
    .from("publication")
    .select("*")
    .eq("slug", decodeURIComponent(params.slug))
    .eq("status", "published")
    .maybeSingle();

  if (error) return <main className="p-6 text-red-600">Erreur chargement article.</main>;
  if (!post) return notFound();

  return (
  <main className="min-h-screen bg-pink-50">
        <Navbar />
       <article className="max-w-3xl mx-auto p-6">
        <a href="/publication" className="text-pink-700 hover:underline">
          ← Retour aux publications
        </a>

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
