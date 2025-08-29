"use client";

import { useEffect, useState, FormEvent } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";

type Temoignage = {
  id: string;
  created_at: string;
  nom: string;
  message: string;
  note: number | null;
};

export default function TemoignagesPage() {
  const [rows, setRows] = useState<Temoignage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ⭐ état pour les étoiles interactives
  const [note, setNote] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("temoignages")
      .select("id, created_at, nom, message, note")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setErr(error.message);
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setSending(true);

    const form = e.currentTarget; // capture AVANT les await
    try {
      const fd = new FormData(form);
      const nom = String(fd.get("nom") || "").trim();
      const message = String(fd.get("message") || "").trim();
      const noteStr = String(fd.get("note") || "").trim();
      const noteVal = noteStr ? Number(noteStr) : null;

      if (!nom || !message) {
        setErr("Nom et message sont obligatoires.");
        return;
      }

      const { error } = await supabase
        .from("temoignages")
        .insert([{ nom, message, note: noteVal }]);

      if (error) {
        setErr(error.message);
        return;
      }

      setOk("Merci pour votre témoignage !");
      form.reset();   // vide les champs
      setNote(null);  // éteint les étoiles
      setHover(null);
      await load();   // recharge la liste
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold text-pink-500 text-center mb-8">Témoignages</h1>

        {ok && <p className="mb-4 rounded-lg px-3 py-2 bg-green-100 text-green-700">{ok}</p>}
        {err && <p className="mb-4 rounded-lg px-3 py-2 bg-red-600 text-white">{err}</p>}

        {/* Formulaire */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 bg-pink-500 p-6 rounded-xl shadow-md max-w-2xl mx-auto mb-10"
        >
          <input
            name="nom"
            type="text"
            placeholder="Votre nom *"
            required
            className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
          />

          <textarea
            name="message"
            placeholder="Votre message *"
            required
            className="w-full border border-pink-300 rounded-lg px-3 py-2 min-h-[120px] bg-pink-400 text-white placeholder-white"
          />

          {/* ⭐ étoiles interactives */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} étoiles`}
                onClick={() => setNote(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                className="text-3xl leading-none cursor-pointer"
                title={`${n} étoile${n > 1 ? "s" : ""}`}
              >
                <svg
                  className={(hover ?? note ?? 0) >= n ? "text-yellow-300" : "text-white/50"}
                  width="28" height="28" viewBox="0 0 24 24"
                  fill="currentColor" aria-hidden="true"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </button>
            ))}
          </div>
          {/* Valeur envoyée */}
          <input type="hidden" name="note" value={note ?? ""} />

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-white text-pink-500 px-6 py-2 rounded-xl hover:bg-gray-100 transition font-semibold disabled:opacity-70"
          >
            {sending ? "Envoi..." : "Publier mon témoignage"}
          </button>
        </form>

        {/* Liste des témoignages */}
        {loading ? (
          <p className="text-pink-500 text-center">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-pink-500 text-center">Aucun témoignage pour le moment.</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-6">
            {rows.map((t) => (
              <li key={t.id} className="rounded-xl border p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 break-words">
                    {t.nom?.trim() || "Anonyme"}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>

                {typeof t.note === "number" && (
                  <div className="mb-2" aria-label={`Note ${t.note}/5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg
                        key={i}
                        className={i < (t.note ?? 0) ? "text-yellow-300" : "text-gray-300"}
                        width="20" height="20" viewBox="0 0 24 24"
                        fill="currentColor" aria-hidden="true"
                        style={{ display: "inline-block", verticalAlign: "middle" }}
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    ))}
                  </div>
                )}

                <p className="text-gray-700 whitespace-pre-wrap">{t.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Footer />
    </main>
  );
}
