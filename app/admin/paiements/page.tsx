'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type EtudiantLite = {
  id: string;
  nom: string | null;
  telephone?: string | null;
};

type Paiement = {
  id: string;
  etudiant_id: string;
  mois: string;
  statut: string;
  created_at: string;
};

const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fév',
  '03': 'Mar',
  '04': 'Avr',
  '05': 'Mai',
  '06': 'Juin',
  '07': 'Juil',
  '08': 'Août',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Déc',
};

type StatutPaiement = '' | 'paye' | 'non_paye';

export default function AdminPaiementsPage() {
  const [etudiants, setEtudiants] = useState<EtudiantLite[]>([]);
  const [loadingEtudiants, setLoadingEtudiants] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loadingPaiements, setLoadingPaiements] = useState(true);
  const [paiementError, setPaiementError] = useState<string | null>(null);

  const [selectedEtudiantId, setSelectedEtudiantId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<StatutPaiement>('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // 🔁 Charger étudiantes
  useEffect(() => {
    async function loadEtudiants() {
      setLoadingEtudiants(true);
      setError(null);

      const { data, error } = await supabase
        .from('etudiants')
        .select('id, nom, telephone')
        .order('nom', { ascending: true });

      if (error) {
        console.error('Erreur chargement etudiants pour paiements:', error);
        setError("Erreur lors du chargement de la liste des étudiantes.");
        setEtudiants([]);
      } else {
        setEtudiants((data || []) as EtudiantLite[]);
      }

      setLoadingEtudiants(false);
    }

    void loadEtudiants();
  }, []);

  // 🔁 Charger paiements
  useEffect(() => {
    async function loadPaiements() {
      setLoadingPaiements(true);
      setPaiementError(null);

      const { data, error } = await supabase
        .from('paiements')
        .select('id, etudiant_id, mois, statut, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement paiements:', error);
        setPaiementError("Erreur lors du chargement des paiements.");
        setPaiements([]);
      } else {
        setPaiements((data || []) as Paiement[]);
      }

      setLoadingPaiements(false);
    }

    void loadPaiements();
  }, []);

  // filtre recherche pour la liste
  const filteredEtudiants = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return etudiants;

    return etudiants.filter((e) => {
      const nom = (e.nom || '').toLowerCase();
      const tel = (e.telephone || '').toLowerCase();
      return nom.includes(s) || tel.includes(s);
    });
  }, [etudiants, searchTerm]);

  // auto-sélection si une seule trouvée
  useEffect(() => {
    const s = searchTerm.trim();
    if (!s) return;

    if (filteredEtudiants.length === 1) {
      const unique = filteredEtudiants[0];
      setSelectedEtudiantId(unique.id);
    }
  }, [searchTerm, filteredEtudiants]);

  const etudianteSelectionnee =
    etudiants.find((e) => e.id === selectedEtudiantId) || null;
  const monthLabel =
    selectedMonth ? MONTHS.find((m) => m.value === selectedMonth)?.label : '';

  function statutLabel(value: StatutPaiement | string) {
    if (value === 'paye') return 'Payé';
    if (value === 'non_paye') return 'Non payé';
    return '';
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function monthShort(value: string) {
    return MONTH_SHORT[value] ?? value;
  }

  // 📤 Enregistrer un paiement
  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(null);

    if (!selectedEtudiantId || !selectedMonth || !selectedStatus) {
      setSaveError(
        'Sélectionne une étudiante, un mois et un statut avant de confirmer.',
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('paiements').insert({
      etudiant_id: selectedEtudiantId,
      mois: selectedMonth,
      statut: selectedStatus,
    });

    if (error) {
      console.error('Erreur insert paiements:', error);
      setSaveError("Erreur lors de l'enregistrement du paiement.");
      setSaving(false);
      return;
    }

    setSaveSuccess('✅ Paiement enregistré avec succès.');
    setSaving(false);

    setSelectedEtudiantId('');
    setSelectedMonth('');
    setSelectedStatus('');

    // recharger les paiements pour mettre à jour le tableau
    const { data, error: reloadError } = await supabase
      .from('paiements')
      .select('id, etudiant_id, mois, statut, created_at')
      .order('created_at', { ascending: false });

    if (!reloadError && data) {
      setPaiements(data as Paiement[]);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-pink-700">
              Gestion des paiements
            </h1>
            <p className="text-sm text-gray-600">
              Confirme ici les paiements mensuels, puis consulte le résumé par
              catégorie sur la page Paiement étudiant.
            </p>
            {(error || paiementError) && (
              <p className="mt-1 text-xs text-red-600">
                ❌ {error || paiementError}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 text-xs">
            <Link
              href="/admin/paiement-etudiant"
              className="px-3 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
            >
              📊 Résumé paiements étudiantes
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
            >
              ⬅️ Dashboard
            </Link>
          </div>
        </div>

        {/* 1️⃣ Fiche de paiement */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-pink-700">
            Fiche de paiement mensuel
          </h2>

          {saveError && (
            <p className="text-xs text-red-600">❌ {saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-xs text-green-600">{saveSuccess}</p>
          )}
 <label className="block text-xs font-medium text-gray-600 mb-1">
                Recherche (nom ou téléphone)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex : Marie, 509..."
                className="w-full border rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />

          <div className="grid gap-4 md:grid-cols-3">
            {/* Recherche + liste étudiantes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Liste des étudiantes
              </label>
              <select
                value={selectedEtudiantId}
                onChange={(e) => setSelectedEtudiantId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">
                  {loadingEtudiants
                    ? 'Chargement...'
                    : 'Sélectionner une étudiante'}
                </option>
                {filteredEtudiants.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom || '(Sans nom)'}
                    {e.telephone ? ` — ${e.telephone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Mois */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">Sélectionner un mois</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Statut du paiement
              </label>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as StatutPaiement)
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">Sélectionner un statut</option>
                <option value="paye">Payé</option>
                <option value="non_paye">Non payé</option>
              </select>
            </div>
          </div>

          {/* Résumé visuel */}
          <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold mb-1">Résumé de la fiche :</p>
            <p>
              <span className="font-medium">Étudiante : </span>
              {etudianteSelectionnee
                ? `${etudianteSelectionnee.nom || '(Sans nom)'}${
                    etudianteSelectionnee.telephone
                      ? ' — ' + etudianteSelectionnee.telephone
                      : ''
                  }`
                : 'Aucune étudiante sélectionnée'}
            </p>
            <p>
              <span className="font-medium">Mois : </span>
              {monthLabel || 'Aucun mois sélectionné'}
            </p>
            <p>
              <span className="font-medium">Statut : </span>
              {statutLabel(selectedStatus) || 'Aucun statut sélectionné'}
            </p>
          </div>

          {/* Bouton enregistrer */}
          <div className="pt-3 border-t border-pink-100 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                !selectedEtudiantId ||
                !selectedMonth ||
                !selectedStatus
              }
              className="inline-flex items-center gap-2 rounded-lg bg-pink-600 text-white text-xs sm:text-sm px-4 py-2 hover:bg-pink-700 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : '✅ Enregistrer ce paiement'}
            </button>
          </div>
        </div>

        {/* 2️⃣ Tableau des paiements enregistrés */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-pink-700">
              Paiements enregistrés
            </h2>
            <span className="inline-flex items-center rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
              {paiements.length} enregistrement
              {paiements.length > 1 ? 's' : ''}
            </span>
          </div>

          {loadingPaiements ? (
            <p className="text-xs text-gray-500">
              Chargement des paiements…
            </p>
          ) : paiements.length === 0 ? (
            <p className="text-xs text-gray-500">
              Aucun paiement enregistré pour l&apos;instant.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-pink-50">
                    <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                      Étudiante
                    </th>
                    <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                      Mois
                    </th>
                    <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                      Statut
                    </th>
                    <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                      Enregistré le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((p) => {
                    const etu =
                      etudiants.find((e) => e.id === p.etudiant_id) || null;

                    return (
                      <tr key={p.id} className="hover:bg-pink-50/70">
                        <td className="border border-pink-100 px-2 py-1">
                          {etu
                            ? etu.nom || '(Sans nom)'
                            : `(id: ${p.etudiant_id})`}
                        </td>
                        <td className="border border-pink-100 px-2 py-1">
                          {monthShort(p.mois)}
                        </td>
                        <td className="border border-pink-100 px-2 py-1">
                          {statutLabel(p.statut)}
                        </td>
                        <td className="border border-pink-100 px-2 py-1">
                          {formatDate(p.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
