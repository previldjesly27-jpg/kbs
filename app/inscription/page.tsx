'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ajouterInscription } from "./actions";

// Helpers
function toIsoFromFr(fr: string): string | null {
  // "JJ/MM/AAAA" -> "YYYY-MM-DD"
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, JJ, MM, YYYY] = m;
  const dd = Number(JJ), mm = Number(MM), yyyy = Number(YYYY);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${YYYY}-${MM}-${JJ}`;
}
function ageFromIso(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export default function InscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Formulaire toujours "propre" au 1er rendu (évite radios cochées au retour arrière)
  useEffect(() => {
    formRef.current?.reset();
  }, []);

  // Masque le bandeau succès si jamais on l'affiche
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

    // Champs requis
    const nom = String(fd.get('nom') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const telephone = String(fd.get('telephone') || '').trim();
    const date_naissance_fr = String(fd.get('date_naissance') || '').trim();
    const responsable_nom = String(fd.get('responsable_nom') || '').trim();
    const responsable_tel = String(fd.get('responsable_tel') || '').trim();

    // Horaire — l'utilisateur doit choisir (aucune valeur par défaut)
    const programmeVal = (fd.get('programme')?.toString() || '').toLowerCase();
    if (programmeVal !== 'semaine' && programmeVal !== 'weekend') {
      setErr('Choisissez une option de formation (Semaine ou Weekend).');
      setLoading(false);
      return;
    }
    const programme = programmeVal as 'semaine' | 'weekend';

    // Spécialités (checkbox multiples)
    const specialites = Array.from(
      new Set(
        fd
          .getAll('specialites')
          .map((v) => String(v).toLowerCase().trim())
          .filter(Boolean),
      ),
    );

    // Validations côté JS
    if (!nom || !email || !telephone || !date_naissance_fr || !responsable_nom || !responsable_tel) {
      setErr('Tous les champs sont obligatoires.');
      setLoading(false);
      return;
    }
    if (specialites.length === 0) {
      setErr('Sélectionnez au moins un programme (spécialité).');
      setLoading(false);
      return;
    }

    const date_naissance_iso = toIsoFromFr(date_naissance_fr);
    if (!date_naissance_iso) {
      setErr('Date invalide (format JJ/MM/AAAA).');
      setLoading(false);
      return;
    }
    if (ageFromIso(date_naissance_iso) < 15) {
      setErr('Âge minimum requis : 15 ans.');
      setLoading(false);
      return;
    }

    try {
      // Anti-doublon : même email + date de naissance
      const { count: dupCount, error: dupErr } = await supabase
        .from('inscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .eq('date_naissance', date_naissance_iso);

      if (!dupErr && (dupCount ?? 0) > 0) {
        setErr("Vous êtes déjà inscrit(e) avec cet email et cette date de naissance.");
        setLoading(false);
        return;
      }

      // Insert
      const { error } = await supabase.from('inscriptions').insert({
        nom,
        email,
        telephone,
        date_naissance: date_naissance_iso,
        responsable_nom,
        responsable_tel,
        specialites, // text[] côté Supabase
        programme,   // 'semaine' | 'weekend'
      });

      if (error) {
        if ((error as any).code === '23505' || /uniq_inscriptions_email_dob/i.test(error.message)) {
          setErr("Vous êtes déjà inscrit(e) avec cet email et cette date de naissance.");
        } else {
          setErr(error.message || "Erreur lors de l'inscription.");
        }
        setLoading(false);
        return;
     }

      // 🔔 NOUVEAU : envoyer l'email admin via la server action
      try {
        await ajouterInscription(fd);
      } catch (err) {
        console.error("Erreur envoi email admin :", err);
        // on n'affiche pas d'erreur à l'utilisateur, l'inscription est déjà enregistrée
      }
      // Redirection vers la page succès avec les infos utiles
      const qs = new URLSearchParams({
        nom,
        telephone,
        email,
        programme,
        specialites: specialites.join(','), // "maquillage,cosmetologie"
      }).toString();

      router.push(`/inscription/success?${qs}`);
      return;
      
    } catch (e: any) {
      setErr(e?.message || 'Erreur inattendue.');
      setLoading(false);
      return;
    }
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

        {sent && (
          <div className="mb-4 rounded-xl border border-green-300 bg-green-50 text-green-700 px-4 py-3">
            Merci ! Votre inscription a été enregistrée ✅
          </div>
        )}

        <form
          ref={formRef}
          noValidate            // ⬅️ désactive la validation HTML5
          autoComplete="off"
          onSubmit={onSubmit}
          className="space-y-4 bg-pink-500 p-6 rounded-xl shadow"
        >
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

          {/* Date de naissance (JJ/MM/AAAA) */}
          <div>
            <label htmlFor="date_naissance" className="block text-white mb-1">Date de naissance *</label>
            <input
              id="date_naissance"
              name="date_naissance"
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="JJ/MM/AAAA"
              maxLength={10}
              className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
              onInput={(e) => {
                const el = e.currentTarget;
                const d = el.value.replace(/\D+/g, '').slice(0, 8);
                let out = d;
                if (d.length > 4) out = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
                else if (d.length > 2) out = d.slice(0, 2) + '/' + d.slice(2);
                el.value = out;
              }}
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
                pattern="^[0-9+\\s-]{7,}$"
                title="Entrez au moins 7 chiffres (vous pouvez utiliser +, espace ou -)"
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
              pattern="^[0-9+\\s-]{7,}$"
              title="Entrez au moins 7 chiffres (vous pouvez utiliser +, espace ou -)"
              className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
            />
          </div>

          {/* Programmes (multi-sélection) */}
          <div>
            <p className="block text-white mb-2 font-medium">Choisir un ou plusieurs programmes *</p>
            <fieldset className="space-y-2">
              {[
                { value: 'maquillage', label: 'Maquillage' },
                { value: 'cosmetologie', label: 'Cosmétologie' },
                { value: 'decoration', label: 'Décoration' },              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 bg-pink-400/60 hover:bg-pink-400 rounded-lg px-3 py-2 border border-pink-300 text-white cursor-pointer"
                >
                  <input type="checkbox" name="specialites" value={opt.value} className="h-4 w-4" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>
            <p className="text-white/80 text-sm mt-1">Vous pouvez sélectionner plusieurs programmes.</p>
          </div>

          {/* Horaire (Semaine / Weekend) — AUCUNE valeur cochée par défaut */}
          <div>
            <p className="block text-white mb-2 font-medium">Option de formation *</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 bg-pink-400/60 hover:bg-pink-400 rounded-lg px-3 py-2 border border-pink-300 text-white cursor-pointer">
                <input
                  type="radio"
                  name="programme"
                  value="semaine"
                  className="h-4 w-4 accent-pink-600"
                />
                <span>Semaine</span>
              </label>
              <label className="flex items-center gap-3 bg-pink-400/60 hover:bg-pink-400 rounded-lg px-3 py-2 border border-pink-300 text-white cursor-pointer">
                <input
                  type="radio"
                  name="programme"
                  value="weekend"
                  className="h-4 w-4 accent-pink-600"
                />
                <span>Weekend</span>
              </label>
            </div>
          </div>

          {/* Message d'erreur */}
          {err && <p className="text-white/90 bg-pink-700/60 rounded-lg px-3 py-2">{err}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-pink-500 px-6 py-2 rounded-xl hover:bg-gray-100 transition font-semibold disabled:opacity-70"
          >
            {loading ? 'Envoi...' : 'S’inscrire'}
          </button>
        </form>
      </section>

      <Footer />
    </main>
  );
}
