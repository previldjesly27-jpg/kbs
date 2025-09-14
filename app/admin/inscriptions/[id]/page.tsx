'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// ───────────────── Types & helpers ─────────────────
const ALLOWED_STATUTS = ['nouveau', 'archive'] as const;
type Statut = (typeof ALLOWED_STATUTS)[number];

function normalizeStatut(s: string | null | undefined): Statut {
  const x = (s ?? '').toString().toLowerCase().trim();
  return x === 'archive' ? 'archive' : 'nouveau';
}

type Inscription = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null; // ISO yyyy-mm-dd
  responsable_nom: string | null;
  responsable_tel: string | null;
  specialites: string[] | null;
  programme: 'semaine' | 'weekend' | null;
  statut: Statut | null;
};

type FormState = {
  nom: string;
  email: string;
  telephone: string;
  date_naissance: string;
  responsable_nom: string;
  responsable_tel: string;
  specialites: string[];
  programme: 'semaine' | 'weekend';
  statut: Statut;
};

const SPEC_OPTS = [
  { value: 'maquillage',   label: 'Maquillage' },
  { value: 'cosmetologie', label: 'Cosmétologie' },
  { value: 'decoration',   label: 'Décoration' },
] as const;

// groupe (table etudiants) : 1 = semaine, 2 = weekend
function groupeToDb(p: 'semaine' | 'weekend') {
  return p === 'weekend' ? 2 : 1;
}

// ───────────────── Page ─────────────────
export default function AdminInscriptionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const searchParams = useSearchParams();
  const wantsEdit = searchParams.get('edit') === '1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [insc, setInsc] = useState<Inscription | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [form, setForm] = useState<FormState>({
    nom: '',
    email: '',
    telephone: '',
    date_naissance: '',
    responsable_nom: '',
    responsable_tel: '',
    specialites: [],
    programme: 'semaine',
    statut: 'nouveau',
  });

  // Charger l’inscription
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from('inscriptions')
        .select(
          'id, created_at, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, specialites, programme, statut'
        )
        .eq('id', id)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data) {
        setErr(error?.message || 'Inscription introuvable');
        setLoading(false);
        return;
      }

      setInsc(data as Inscription);

      const rawSpecs = (data.specialites ?? []) as string[];
      const specs = Array.from(new Set(rawSpecs.map((s: string) => s.toLowerCase())));
      const iso = (data.date_naissance || '').slice(0, 10);

      setForm({
        nom: data.nom || '',
        email: data.email || '',
        telephone: data.telephone || '',
        date_naissance: iso || '',
        responsable_nom: data.responsable_nom || '',
        responsable_tel: data.responsable_tel || '',
        specialites: specs,
        programme: (data.programme === 'weekend' ? 'weekend' : 'semaine'),
        statut: normalizeStatut(data.statut),
      });

      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [id]);

  // Helpers d’affichage
  const createdAt = useMemo(
    () => (insc?.created_at ? new Date(insc.created_at).toLocaleString('fr-FR') : '—'),
    [insc?.created_at]
  );

  function toggleSpec(val: string) {
    setForm((f) => {
      const has = f.specialites.includes(val);
      return { ...f, specialites: has ? f.specialites.filter((x) => x !== val) : [...f.specialites, val] };
    });
  }

  // Sauvegarde
  async function save() {
    setSaving(true);
    setErr(null);

    // validations rapides
    if (!form.nom.trim()) return setErr('Nom requis'), setSaving(false);
    if (!form.email.trim()) return setErr('Email requis'), setSaving(false);
    if (!form.telephone.trim()) return setErr('Téléphone requis'), setSaving(false);
    if (!form.date_naissance) return setErr('Date de naissance requise'), setSaving(false);
    if (form.specialites.length === 0) return setErr('Sélectionnez au moins un programme'), setSaving(false);

    const { error } = await supabase
      .from('inscriptions')
      .update({
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        date_naissance: form.date_naissance,
        responsable_nom: form.responsable_nom.trim(),
        responsable_tel: form.responsable_tel.trim(),
        specialites: form.specialites,
        programme: form.programme,
        statut: normalizeStatut(form.statut),
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    alert('Inscription mise à jour ✅');
  }

  // Confirmation → création Étudiant, puis ARCHIVE l’inscription
  async function confirmToStudent() {
  if (!insc) return;
  setSaving(true);
  setErr(null);

  try {
    // valeurs depuis le formulaire
    const groupeTxt: 'semaine' | 'weekend' = form.programme;
    const groupeInt = groupeTxt === 'weekend' ? 2 : 1;
    const filiere = form.specialites[0] || null; // spécialité principale (maquillage/cosmetologie/decoration)

    // 1) Créer l'étudiant (essai groupe en TEXTE)
    let created: { id: string } | null = null;
    let e2: any = null;

    ({ data: created, error: e2 } = await supabase
      .from('etudiants')
      .insert({
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        date_naissance: form.date_naissance || null,
        responsable_nom: form.responsable_nom.trim() || null,
        responsable_tel: form.responsable_tel.trim() || null,
        programme: filiere,                         // ✅ programme = spécialité
        specialites: filiere ? [filiere] : null,
        groupe: groupeTxt,                          // groupe = semaine/weekend (texte)
        statut: 'actif',
      })
      .select('id')
      .single());

    // 2) Fallback si la colonne groupe est INTEGER (1/2)
    if (e2) {
      ({ data: created, error: e2 } = await supabase
        .from('etudiants')
        .insert({
          nom: form.nom.trim(),
          email: form.email.trim(),
          telephone: form.telephone.trim(),
          date_naissance: form.date_naissance || null,
          responsable_nom: form.responsable_nom.trim() || null,
          responsable_tel: form.responsable_tel.trim() || null,
          programme: filiere,
          specialites: filiere ? [filiere] : null,
          groupe: groupeInt,                        // 1 = semaine, 2 = weekend
          statut: 'actif',
        })
        .select('id')
        .single());
    }

    if (e2 || !created) {
      setErr(e2?.message || 'Création étudiant impossible');
      return;
    }

    // 3) SUPPRIMER l'inscription (au lieu d’archiver)
    const { error: delErr } = await supabase
      .from('inscriptions')
      .delete()
      .eq('id', insc.id);

    if (delErr) {
      alert("Étudiant créé, mais suppression de l'inscription impossible : " + delErr.message);
    }

    // 4) Aller sur la fiche étudiant
    router.push(`/admin/etudiants/${created.id}`);
  } finally {
    setSaving(false);
  }
}


  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="max-w-3xl mx-auto px-4 py-10 text-pink-600">Chargement…</section>
      </main>
    );
  }

  if (err) {
    return (
      <main className="min-h-screen bg-white">
        <section className="max-w-3xl mx-auto px-4 py-10">
          <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">{err}</p>
          <div className="mt-4">
            <Link href="/admin/inscriptions" className="text-pink-600 underline">← Retour à la liste</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-4 py-8 text-pink-700">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/admin/inscriptions" className="text-pink-600 hover:underline">← Retour</Link>
          <div className="text-xs text-pink-400">ID: {insc?.id || '—'}</div>
        </div>

        <h1 className="text-2xl font-bold text-pink-600">Dossier inscription</h1>
        <p className="text-sm text-pink-500 mt-1">
          Créé le {createdAt}
          {form.specialites.length > 0 && (
            <> • Programme : {form.specialites[0]?.charAt(0).toUpperCase() + form.specialites[0]?.slice(1)} / {form.programme === 'weekend' ? 'Weekend' : 'Semaine'}</>
          )}
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Téléphone</label>
            <input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Naissance</label>
            <input type="date" value={form.date_naissance} onChange={(e) => setForm((f) => ({ ...f, date_naissance: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Responsable</label>
            <input value={form.responsable_nom} onChange={(e) => setForm((f) => ({ ...f, responsable_nom: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Tél. responsable</label>
            <input value={form.responsable_tel} onChange={(e) => setForm((f) => ({ ...f, responsable_tel: e.target.value }))} className="w-full border border-pink-300 rounded-lg px-3 py-2"/>
          </div>
        </div>

        {/* Spécialités & Programme */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="block text-sm mb-2">Programmes (spécialités)</p>
            <fieldset className="space-y-2">
              {SPEC_OPTS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 rounded-lg px-3 py-2 border border-pink-200">
                  <input type="checkbox" checked={form.specialites.includes(opt.value)} onChange={() => toggleSpec(opt.value)} className="h-4 w-4"/>
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          <div>
            <p className="block text-sm mb-2">Option de formation</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="programme" checked={form.programme === 'semaine'} onChange={() => setForm((f) => ({ ...f, programme: 'semaine' }))}/>
                <span>Semaine</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="programme" checked={form.programme === 'weekend'} onChange={() => setForm((f) => ({ ...f, programme: 'weekend' }))}/>
                <span>Weekend</span>
              </label>
            </div>
          </div>
        </div>

        {/* Statut */}
        <div className="mt-6 max-w-sm">
          <label className="block text-sm mb-2">Statut</label>
          <select
            value={form.statut}
            onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as Statut }))}
            className="w-full border border-pink-300 rounded-lg px-3 py-2"
          >
            <option value="nouveau">Nouveau</option>
            <option value="archive">Archivé</option>
          </select>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => void save()} disabled={saving} className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>

          <button
            onClick={() => void confirmToStudent()}
            disabled={confirming}
            className="border border-pink-300 text-pink-600 px-3 py-2 rounded-lg hover:bg-pink-50 disabled:opacity-60"
          >
            {confirming ? 'Veuillez patienter…' : 'Confirmer → Étudiant '}
          </button>

          <Link href="/admin/inscriptions" className="px-4 py-2 rounded-lg border border-pink-200 hover:bg-pink-50">
            Retour à la liste
          </Link>
        </div>
      </section>
    </main>
  );
}
