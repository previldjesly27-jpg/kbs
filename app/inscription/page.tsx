"use client";

import { FormEvent, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabaseClient";

export default function InscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false); // ✅ message de succès

  // Masquer automatiquement le bandeau après 5s (optionnel)
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 5000);
    return () => clearTimeout(t);
  }, [sent]);

async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErr(null);
  setLoading(true);

  const form = e.currentTarget as HTMLFormElement;
  const fd = new FormData(form);

  const nom = String(fd.get("nom") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const telephone = String(fd.get("telephone") || "").trim();
  const date_naissance_raw = String(fd.get("date_naissance") || "").trim();
  const date_naissance = date_naissance_raw || null;

  const responsable_nom = String(fd.get("responsable_nom") || "").trim() || null;
  const responsable_tel = String(fd.get("responsable_tel") || "").trim() || null;

  // ✅ multi-sélection → tableau
  const specialites = Array.from(
    new Set(
      fd.getAll("specialites")
        .map(v => String(v).toLowerCase().trim())
        .filter(Boolean)
    )
  );

  // Validations
  if (!nom || !email || !telephone || !date_naissance || !responsable_nom || !responsable_tel) {
    setErr("Tous les champs sont obligatoires.");
    setLoading(false);
    return;
  }
  if (specialites.length === 0) {
    setErr("Sélectionnez au moins un programme.");
    setLoading(false);
    return;
  }

  // ✅ on n'envoie QUE 'specialites' (le trigger remplit 'specialite')
  const { error } = await supabase.from("inscriptions").insert({
    nom,
    email,
    telephone,
    date_naissance,
    responsable_nom,
    responsable_tel,
    specialites,   // ← tableau
  });

  if (error) {
    setErr(error.message);
    setLoading(false);
    return;
  }

  form.reset();
  setLoading(false);
  setSent(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}




  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-pink-500 text-center mb-1">
          Formulaire d'inscription
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Kisa Beauty School • Rue des Marthys, Ouanaminthe, Haïti HT2210 • +509 4116-3845 / +509 3823-5518
        </p>

        {/* ✅ Bandeau de succès */}
        {sent && (
          <div className="mb-4 rounded-xl border border-green-300 bg-green-50 text-green-700 px-4 py-3">
            Merci ! Votre inscription a été enregistrée ✅
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 bg-pink-500 p-6 rounded-xl shadow">
  {/* Nom */}
  <div>
    <label className="block text-white mb-1">Nom complet *</label>
    <input
      name="nom"
      type="text"
      required
      placeholder="Votre nom"
      className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
    />
  </div>

  {/* Date de naissance */}
  <div>
    <label className="block text-white mb-1">Date de naissance *</label>
    <input
      name="date_naissance"
      type="date"
      required
      className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
    />
  </div>

  {/* Email + Téléphone */}
  <div className="grid sm:grid-cols-2 gap-4">
    <div>
      <label className="block text-white mb-1">Email *</label>
      <input
        name="email"
        type="email"
        required
        placeholder="vous@exemple.com"
        className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
      />
    </div>
    <div>
      <label className="block text-white mb-1">Téléphone *</label>
      <input
        name="telephone"
        type="tel"
        required
        inputMode="tel"
        pattern="^[0-9+\s-]{7,}$"
        title="Entrez au moins 7 chiffres (vous pouvez utiliser +, espace ou -)"
        placeholder=""
        className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
      />
    </div>
  </div>

  {/* Responsable */}
  <div>
    <label className="block text-white mb-1">Personne responsable *</label>
    <input
      name="responsable_nom"
      type="text"
      required
      placeholder="Nom du parent/tuteur"
      className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
    />
  </div>
  <div>
    <label className="block text-white mb-1">Numéro responsable *</label>
    <input
      name="responsable_tel"
      type="tel"
      required
      inputMode="tel"
      pattern="^[0-9+\s-]{7,}$"
      title="Entrez au moins 7 chiffres (vous pouvez utiliser +, espace ou -)"
      placeholder=""
      className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
    />
  </div>

{/* Programmes (multi-sélection) */}
<div>
  <p className="block text-white mb-2 font-medium">Choisir un ou plusieurs programmes *</p>

  <fieldset className="space-y-2">
    {[
      { value: "maquillage", label: "Maquillage" },
      { value: "cosmetologie", label: "Cosmétologie" },
      { value: "decoration", label: "Décoration" },
      { value: "style-crochet", label: "Style crochet" },
    ].map((opt) => (
      <label
        key={opt.value}
        className="flex items-center gap-3 bg-pink-400/60 hover:bg-pink-400
                   rounded-lg px-3 py-2 border border-pink-300 text-white cursor-pointer"
      >
        {/* même name pour envoyer un tableau via FormData.getAll("specialites") */}
        <input type="checkbox" name="specialites" value={opt.value} className="h-4 w-4" />
        <span>{opt.label}</span>
      </label>
    ))}
  </fieldset>

  <p className="text-white/80 text-sm mt-1">Vous pouvez sélectionner plusieurs programmes.</p>
</div>


  {/* Message d'erreur */}
  {err && <p className="text-white/90 bg-pink-700/60 rounded-lg px-3 py-2">{err}</p>}

  {/* Submit */}
  <button
    type="submit"
    disabled={loading}
    className="w-full bg-white text-pink-500 px-6 py-2 rounded-xl hover:bg-gray-100 transition font-semibold disabled:opacity-70"
  >
    {loading ? "Envoi..." : "S’inscrire"}
  </button>
</form>

      </section>

      <Footer />
    </main>
  );
}
