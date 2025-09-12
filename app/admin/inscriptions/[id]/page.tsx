'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Statut = 'nouveau' | 'confirme' | 'paye' | 'termine';

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

// Form local
type FormState = {
  nom: string;
  email: string;
  telephone: string;
  date_naissance: string; // yyyy-mm-dd (input[type=date])
  responsable_nom: string;
  responsable_tel: string;
  specialites: string[]; // toujours en minuscule
  programme: 'semaine' | 'weekend';
};

const SPEC_OPTS = [
  { value: 'maquillage',   label: 'Maquillage' },
  { value: 'cosmetologie', label: 'Cosmétologie' },
  { value: 'decoration',   label: 'Décoration' },
] as const;

// groupe en BDD (table etudiants) : 1 = semaine, 2 = weekend
function groupeToDb(p: 'semaine' | 'weekend') {
  return p === 'weekend' ? 2 : 1;
}
function exportCsvEtudiants(data: any[]) {
  // Petits helpers locaux
  const csvEscape = (v: unknown, sep = ";") => {
    const s = String(v ?? "");
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const fmtDateTimeFR = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-FR") : "";
  const labelProg = (p?: string | null) => {
    const v = (p || "").toLowerCase();
    if (v === "maquillage") return "Maquillage";
    if (v === "cosmetologie") return "Cosmétologie";
    if (v === "decoration") return "Décoration";
    if (v === "style-crochet") return "Style crochet";
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
  };
  const programmeLabel = (r: any) =>
    labelProg(r.programme || (r.specialites?.[0] ?? ""));
  const groupeLabel = (g?: string | number | null) => {
    if (typeof g === "number") return g === 2 ? "Weekend" : "Semaine";
    const v = (g || "").toLowerCase();
    return v.includes("week") ? "Weekend" : v ? "Semaine" : "";
  };
  const statutLabel = (s?: string | null) => {
    const v = (s || "actif").toLowerCase();
    if (v === "archive") return "Archivé";
    return "Actif";
  };

  const header = ["Date", "Nom", "Email", "Téléphone", "Programme", "Groupe", "Statut"];
  const lines = data.map((r) => [
    fmtDateTimeFR(r.created_at),
    r.nom ?? "",
    r.email ?? "",
    r.telephone ?? "",
    programmeLabel(r),
    groupeLabel(r.groupe),
    statutLabel(r.statut),
  ]);

  const sep = ";";
  const csv = [header, ...lines]
    .map((row) => row.map((v) => csvEscape(v, sep)).join(sep))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `etudiants_kbs_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminInscriptionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  const searchParams = useSearchParams(); // ⚠️ en haut pour éviter l’erreur “Rules of Hooks”
  const wantsEdit = searchParams.get('edit') === '1';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [insc, setInsc] = useState<Inscription | null>(null);
const [confirming, setConfirming] = useState(false);

// ➜ Remplace TOUTE cette fonction par celle-ci
async function confirmToEtudiantFromDetail() {
  if (confirming) return;
  setConfirming(true);

  try {
    // 1) Relire l’inscription depuis la DB
    const { data: insc, error } = await supabase
      .from("inscriptions")
      .select(
        "id, nom, email, telephone, date_naissance, responsable_nom, responsable_tel, programme, specialites"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !insc) {
      alert(error?.message || "Inscription introuvable");
      return;
    }

    // 2) Programme (cours) = 1ʳᵉ spécialité ; Groupe = semaine/weekend
    const progCours = (insc.specialites?.[0] ?? null) as string | null;
    const groupeTxt: "semaine" | "weekend" =
      String(insc.programme || "").toLowerCase().includes("week") ? "weekend" : "semaine";
    const groupeInt = groupeTxt === "weekend" ? 2 : 1;

    // 3) Créer l'étudiant (essai en TEXTE, fallback en ENTIER)
    let created: { id: string } | null = null;
    let e2: any = null;

    ({ data: created, error: e2 } = await supabase
      .from("etudiants")
      .insert({
        nom: insc.nom,
        email: insc.email,
        telephone: insc.telephone,
        date_naissance: insc.date_naissance,
        responsable_nom: insc.responsable_nom,
        responsable_tel: insc.responsable_tel,
        programme: progCours,                           // ✅ cours
        specialites: progCours ? [progCours] : null,    // ✅ synchro
        groupe: groupeTxt,                              // texte
        statut: "actif",
      })
      .select("id")
      .single());

    if (e2) {
      ({ data: created, error: e2 } = await supabase
        .from("etudiants")
        .insert({
          nom: insc.nom,
          email: insc.email,
          telephone: insc.telephone,
          date_naissance: insc.date_naissance,
          responsable_nom: insc.responsable_nom,
          responsable_tel: insc.responsable_tel,
          programme: progCours,
          specialites: progCours ? [progCours] : null,
          groupe: groupeInt,                            // entier 1/2
          statut: "actif",
        })
        .select("id")
        .single());
    }

    if (e2 || !created) {
      alert(e2?.message || "Création étudiant impossible");
      return;
    }

    // 4) Supprimer l’inscription source
    const { error: delErr } = await supabase
      .from("inscriptions")
      .delete()
      .eq("id", insc.id);

    if (delErr) {
      alert("Étudiant créé, mais suppression de l’inscription impossible : " + delErr.message);
    }

    // 5) Aller sur la fiche étudiant
    router.push(`/admin/etudiants/${created.id}`);
  } finally {
    setConfirming(false);
  }
}


  const [form, setForm] = useState<FormState>({
    nom: '',
    email: '',
    telephone: '',
    date_naissance: '',
    responsable_nom: '',
    responsable_tel: '',
    specialites: [],
    programme: 'semaine',
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
        setErr(error?.message || "Inscription introuvable");
        setLoading(false);
        return;
      }

      setInsc(data as Inscription);

      // -- Alimente le formulaire (avec typings explicites) --
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
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Helpers d’affichage
  const createdAt = useMemo(
    () => (insc?.created_at ? new Date(insc.created_at).toLocaleString('fr-FR') : '—'),
    [insc?.created_at]
  );

  function toggleSpec(val: string) {
    setForm((f) => {
      const has = f.specialites.includes(val);
      return {
        ...f,
        specialites: has
          ? f.specialites.filter((x) => x !== val)
          : [...f.specialites, val],
      };
    });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    // validations rapides
    if (!form.nom.trim()) return setErr("Nom requis"), setSaving(false);
    if (!form.email.trim()) return setErr("Email requis"), setSaving(false);
    if (!form.telephone.trim()) return setErr("Téléphone requis"), setSaving(false);
    if (!form.date_naissance) return setErr("Date de naissance requise"), setSaving(false);
    if (form.specialites.length === 0) return setErr("Sélectionnez au moins un programme"), setSaving(false);

    const { error } = await supabase
      .from('inscriptions')
      .update({
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        date_naissance: form.date_naissance, // input date → ISO yyyy-mm-dd
        responsable_nom: form.responsable_nom.trim(),
        responsable_tel: form.responsable_tel.trim(),
        specialites: form.specialites,
        programme: form.programme,
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    alert('Inscription mise à jour ✅');
  }

  async function confirmToStudent() {
    if (!insc) return;
    setSaving(true);
    setErr(null);

    // On part des valeurs du formulaire (les plus fraîches)
    const filiere = form.specialites[0] || null;

    const { data: created, error: e2 } = await supabase
      .from('etudiants')
      .insert({
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        date_naissance: form.date_naissance || null,
        responsable_nom: form.responsable_nom.trim() || null,
        responsable_tel: form.responsable_tel.trim() || null,
        filiere,                       // 1ère spécialité choisie
        programme: form.programme,     // si vous stockez aussi texte côté étudiants
        groupe: groupeToDb(form.programme), // ⚠️ colonne integer avec contrainte (1/2)
        statut: 'actif',
      })
      .select('id')
      .single();

    if (e2) {
      setSaving(false);
      setErr(e2.message);
      return;
    }

    // Marque l’inscription confirmée
    await supabase.from('inscriptions').update({ statut: 'confirme' }).eq('id', id);

    setSaving(false);
    router.push(`/admin/etudiants/${created!.id}`);
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
          <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {err}
          </p>
          <div className="mt-4">
            <Link href="/admin/inscriptions" className="text-pink-600 underline">
              ← Retour à la liste
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-4 py-8 text-pink-700">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/admin/inscriptions"
            className="text-pink-600 hover:underline"
          >
            ← Retour
          </Link>
          <div className="text-xs text-pink-400">
            ID: {insc?.id || '—'}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-pink-600">Dossier inscription</h1>
        <p className="text-sm text-pink-500 mt-1">
          Créé le {createdAt}
          {form.specialites.length > 0 && (
            <> • Programme : {form.specialites[0]?.charAt(0).toUpperCase() + form.specialites[0]?.slice(1)} / {form.programme === 'weekend' ? 'Weekend' : 'Semaine'}</>
          )}
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom */}
          <div>
            <label className="block text-sm mb-1">Nom</label>
            <input
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
          {/* Téléphone */}
          <div>
            <label className="block text-sm mb-1">Téléphone</label>
            <input
              value={form.telephone}
              onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
          {/* Naissance */}
          <div>
            <label className="block text-sm mb-1">Naissance</label>
            <input
              type="date"
              value={form.date_naissance}
              onChange={(e) => setForm((f) => ({ ...f, date_naissance: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
          {/* Responsable */}
          <div>
            <label className="block text-sm mb-1">Responsable</label>
            <input
              value={form.responsable_nom}
              onChange={(e) => setForm((f) => ({ ...f, responsable_nom: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
          {/* Tél. responsable */}
          <div>
            <label className="block text-sm mb-1">Tél. responsable</label>
            <input
              value={form.responsable_tel}
              onChange={(e) => setForm((f) => ({ ...f, responsable_tel: e.target.value }))}
              className="w-full border border-pink-300 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        {/* Spécialités & Programme */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="block text-sm mb-2">Programmes (spécialités)</p>
            <fieldset className="space-y-2">
              {SPEC_OPTS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 border border-pink-200"
                >
                  <input
                    type="checkbox"
                    checked={form.specialites.includes(opt.value)}
                    onChange={() => toggleSpec(opt.value)}
                    className="h-4 w-4"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          <div>
            <p className="block text-sm mb-2">Option de formation</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="programme"
                  checked={form.programme === 'semaine'}
                  onChange={() => setForm((f) => ({ ...f, programme: 'semaine' }))}
                />
                <span>Semaine</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="programme"
                  checked={form.programme === 'weekend'}
                  onChange={() => setForm((f) => ({ ...f, programme: 'weekend' }))}
                />
                <span>Weekend</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => void save()}
            disabled={saving}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
         
         <button
  onClick={confirmToEtudiantFromDetail}
  disabled={confirming}
  className="ml-2 border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50 disabled:opacity-60"
>
  {confirming ? "Veuillez patienter…" : "Confirmer → Étudiant"}
</button>

         
          <Link
            href="/admin/inscriptions"
            className="px-4 py-2 rounded-lg border border-pink-200 hover:bg-pink-50"
          >
            Retour à la liste
          </Link>
        </div>
      </section>
    </main>
  );
}
