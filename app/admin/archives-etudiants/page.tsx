'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const MONTHS_2025 = [
  { value: '2025-01', label: 'Janvier 2025' },
  { value: '2025-02', label: 'Février 2025' },
  { value: '2025-03', label: 'Mars 2025' },
  { value: '2025-04', label: 'Avril 2025' },
  { value: '2025-05', label: 'Mai 2025' },
  { value: '2025-06', label: 'Juin 2025' },
  { value: '2025-07', label: 'Juillet 2025' },
  { value: '2025-08', label: 'Août 2025' },
  { value: '2025-09', label: 'Septembre 2025' },
  { value: '2025-10', label: 'Octobre 2025' },
  { value: '2025-11', label: 'Novembre 2025' },
  { value: '2025-12', label: 'Décembre 2025' },
];

type ProgrammeKey = 'maquillage' | 'cosmetologie' | 'decoration';

type ArchiveEtudiant = {
  id: number;
  nom: string | null;
  email?: string | null;
  telephone?: string | null;
  programme?: string | null;
  groupe?: string | null;
  created_at: string;
};

export default function AdminArchivesEtudiantsPage() {
  // Mois sélectionné par programme
  const [selectedMonths, setSelectedMonths] = useState<
    Record<ProgrammeKey, string>
  >({
    maquillage: '',
    cosmetologie: '',
    decoration: '',
  });

  // 🔎 Recherche globale (toutes catégories)
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [etudiants, setEtudiants] = useState<ArchiveEtudiant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔁 Charger les étudiantes archivées depuis etudiants_archive
  useEffect(() => {
    async function loadArchives() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('etudiants_archive')
        // ⚠️ adapte les noms des colonnes si besoin
        .select('id, nom, email, telephone, programme, groupe, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('load etudiants_archive error:', error);
        setError("Erreur lors du chargement des archives d'étudiantes.");
        setEtudiants([]);
      } else {
        setEtudiants(data ?? []);
      }

      setLoading(false);
    }

    void loadArchives();
  }, []);

  function handleChangeMonth(programme: ProgrammeKey, value: string) {
    setSelectedMonths((prev) => ({
      ...prev,
      [programme]: value,
    }));
  }

  function programmeMatch(
    programme: string | null | undefined,
    key: ProgrammeKey,
  ) {
    if (!programme) return false;
    const p = programme.toLowerCase();

    if (key === 'maquillage') return p.includes('maquill');
    if (key === 'cosmetologie') return p.includes('cosm');
    if (key === 'decoration') return p.includes('dec');
    return false;
  }

  function monthMatch(createdAt: string, selected: string) {
    if (!selected) return true; // tous les mois
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return false;
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return ym === selected;
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  // 🔁 Prépare les listes par programme + filtre mois + recherche globale
  const listesParProgramme = useMemo(() => {
    const result: Record<ProgrammeKey, ArchiveEtudiant[]> = {
      maquillage: [],
      cosmetologie: [],
      decoration: [],
    };

    const search = searchTerm.toLowerCase().trim();

    (['maquillage', 'cosmetologie', 'decoration'] as ProgrammeKey[]).forEach(
      (key) => {
        const base = etudiants.filter(
          (e) =>
            programmeMatch(e.programme, key) &&
            monthMatch(e.created_at, selectedMonths[key]),
        );

        const filtered = !search
          ? base
          : base.filter((e) => {
              const nom = (e.nom || '').toLowerCase();
              const tel = (e.telephone || '').toLowerCase();
              const mail = (e.email || '').toLowerCase();
              return (
                nom.includes(search) ||
                tel.includes(search) ||
                mail.includes(search)
              );
            });

        result[key] = filtered;
      },
    );

    return result;
  }, [etudiants, selectedMonths, searchTerm]);

  function renderBloc(
    key: ProgrammeKey,
    title: string,
    description: string,
  ) {
    const liste = listesParProgramme[key];

    return (
      <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 flex flex-col gap-3">
        {/* Titre + badge compteur */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-pink-700">{title}</h2>
            <p className="text-xs text-gray-500">{description}</p>
          </div>

          <span className="inline-flex items-center rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
            {liste.length} étudiante{liste.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Menu déroulant Calendrier 2025 */}
        <div className="mt-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Calendrier 2025
          </label>
          <select
            value={selectedMonths[key]}
            onChange={(e) => handleChangeMonth(key, e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="">Tous les mois 2025</option>
            {MONTHS_2025.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contenu : liste des étudiantes filtrées */}
        <div className="flex-1 rounded-xl border border-pink-200 bg-pink-50/60 px-3 py-2">
          {loading ? (
            <p className="text-xs text-gray-500">Chargement des archives...</p>
          ) : liste.length === 0 ? (
            <p className="text-xs text-gray-500">
              Aucune étudiante archivée pour ce programme / mois / recherche.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 border-b border-pink-200 pb-1">
                <span>Nom</span>
                <span>Date</span>
              </div>
              {liste.map((e) => (
  <Link
    key={e.id}
    href={`/admin/archives-etudiants/${e.id}`}
    className="block"
  >
    <div
      className="flex items-center justify-between text-[11px] border-b border-pink-100/70 py-1 px-1 -mx-1 rounded-md hover:bg-pink-100 cursor-pointer"
    >
      <div className="flex flex-col">
        <span className="font-medium text-gray-800">
          {e.nom || '(Sans nom)'}
        </span>
        {e.groupe && (
          <span className="text-[10px] text-gray-500">
            Groupe : {e.groupe}
          </span>
        )}
        {e.telephone && (
          <span className="text-[10px] text-gray-500">
            📞 {e.telephone}
          </span>
        )}
        {e.email && (
          <span className="text-[10px] text-gray-500">
            ✉️ {e.email}
          </span>
        )}
      </div>
      <span className="text-[10px] text-gray-500">
        {formatDate(e.created_at)}
      </span>
    </div>
  </Link>
))}

            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Titre + retour Dashboard */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-pink-700">
              Archives des étudiantes
            </h1>
            <p className="text-sm text-gray-600">
              Consultation des anciennes étudiantes par programme, mois et
              recherche globale (table <code>etudiants_archive</code>).
            </p>
            {error && (
              <p className="mt-1 text-xs text-red-600">
                ❌ {error}
              </p>
            )}
          </div>

          <Link
            href="/admin"
            className="px-3 py-1 text-xs sm:text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-900"
          >
            ⬅️ Dashboard
          </Link>
        </div>

        {/* 🔎 Barre de recherche globale */}
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs sm:text-sm text-gray-600">
            Rechercher une étudiante dans toutes les catégories (nom, téléphone
            ou email).
          </p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex : Marie, 509..., gmail.com"
            className="w-full sm:w-64 border rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        {/* 3 catégories : Maquillage, Cosmétologie, Décoration */}
        <div className="grid gap-6 md:grid-cols-3">
          {renderBloc(
            'maquillage',
            'Maquillage',
            'Archives des étudiantes inscrites en Maquillage.',
          )}
          {renderBloc(
            'cosmetologie',
            'Cosmétologie',
            'Archives des étudiantes inscrites en Cosmétologie.',
          )}
          {renderBloc(
            'decoration',
            'Décoration',
            'Archives des étudiantes inscrites en Décoration.',
          )}
        </div>
      </div>
    </div>
  );
}
