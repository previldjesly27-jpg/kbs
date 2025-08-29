"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Si déjà connecté, vérifie via RPC is_admin()
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.rpc("is_admin");
      if (error) {
        // si erreur, on nettoie et on affiche le message
        await supabase.auth.signOut();
        setErr(error.message);
        return;
      }
      if (data === true) {
        router.replace(next);
      } else {
        await supabase.auth.signOut();
        setErr("Accès réservé aux administrateurs. Cet email n’a pas les droits.");
      }
    })();
  }, [router, next]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").toLowerCase().trim();
    const password = String(fd.get("password") || "");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setErr(signInError.message);
      return;
    }

    // ✅ Vérification d’admin côté base
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      await supabase.auth.signOut();
      setLoading(false);
      setErr(error.message);
      return;
    }
    if (data !== true) {
      await supabase.auth.signOut();
      setLoading(false);
      setErr("Accès réservé aux administrateurs. Cet email n’a pas les droits.");
      return;
    }

    router.replace(next);
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <section className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold text-pink-500 mb-6 text-center">Connexion Admin</h1>

        <form onSubmit={onSubmit} className="space-y-4 bg-pink-500 p-6 rounded-xl shadow">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
            autoComplete="username"
          />
          <input
            name="password"
            type="password"
            placeholder="Mot de passe"
            className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
            autoComplete="current-password"
          />

          {err && <p className="text-white/90 bg-pink-600/60 rounded-lg px-3 py-2">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-pink-500 px-6 py-2 rounded-xl hover:bg-gray-100 transition font-semibold disabled:opacity-70"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
