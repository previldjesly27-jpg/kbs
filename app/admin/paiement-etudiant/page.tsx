'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Etudiant = {
  id: string;
  nom: string | null;
  telephone?: string | null;
  programme?: string | null;
  groupe?: string | null;
};

type Paiement = {
  id: string;
  etudiant_id: string;
  mois: string;
  statut: string;
};

type ProgrammeKey = 'maquillage' | 'cosmetologie' | 'decoration';
type StatusFilter = 'all' | 'paye' | 'non_paye';

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

// Liste des mois entre start et end, ex: 01 → 04 = [01,02,03,04]
function getMonthsInRange(start: string, end: string): string[] {
  let s = Number(start);
  let e = Number(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return [];

  if (s > e) {
    const tmp = s;
    s = e;
    e = tmp;
  }

  const result: string[] = [];
  for (let m = s; m <= e; m++) {
    result.push(m.toString().padStart(2, '0'));
  }
  return result;
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

// ⚠️ Règle : si un seul mois de la période n'est pas payé => Non payé
function statutGlobalPourPeriode(
  pFor: Paiement[],
  monthsRange: string[],
): string {
  if (monthsRange.length === 0) return '-';

  const paidMonths = pFor
    .filter((p) => p.statut === 'paye')
    .map((p) => p.mois);
  const setPaid = new Set(paidMonths);

  for (const m of monthsRange) {
    if (!setPaid.has(m)) {
      return 'Non payé';
    }
  }

  return 'Payé';
}

type CategoryBlockProps = {
  title: string;
  description: string;
  programmeKey: ProgrammeKey;
  etudiants: Etudiant[];
  paiements: Paiement[];
  statusFilter: StatusFilter;
  loading: boolean;
  focusedEtudiantId?: string | null;
};

function CategoryBlock({
  title,
  description,
  programmeKey,
  etudiants,
  paiements,
  statusFilter,
  loading,
  focusedEtudiantId,
}: CategoryBlockProps) {
  const [startMonth, setStartMonth] = useState<string>('01');
  const [endMonth, setEndMonth] = useState<string>('12');

  const rows = useMemo(() => {
    const monthsRange = getMonthsInRange(startMonth, endMonth);

    const etusProgramme = etudiants.filter((e) =>
      programmeMatch(e.programme, programmeKey),
    );

    const baseRows = etusProgramme.map((etu) => {
      const pFor = paiements.filter(
        (p) =>
          p.etudiant_id === etu.id &&
          Number(p.mois) >= Number(startMonth) &&
          Number(p.mois) <= Number(endMonth),
      );

      const statutLabel = statutGlobalPourPeriode(pFor, monthsRange);

      const paidMonths = pFor
        .filter((p) => p.statut === 'paye')
        .map((p) => p.mois);
      const uniquePaid = Array.from(new Set(paidMonths)).sort();

      const moisLabel =
        uniquePaid.length > 0
          ? uniquePaid
              .map((m) => MONTH_SHORT[m] ?? m)
              .join(' - ')
          : '-';

      return {
        etudiant: etu,
        moisLabel,
        statutLabel,
      };
    });

    // Filtre par statut + par étudiante ciblée (si fourni)
    const filteredRows = baseRows.filter((row) => {
      if (focusedEtudiantId && row.etudiant.id !== focusedEtudiantId) {
        return false;
      }
      if (statusFilter === 'paye' && row.statutLabel !== 'Payé') return false;
      if (statusFilter === 'non_paye' && row.statutLabel !== 'Non payé')
        return false;
      return true;
    });

    return filteredRows;
  }, [
    etudiants,
    paiements,
    programmeKey,
    startMonth,
    endMonth,
    statusFilter,
    focusedEtudiantId,
  ]);

  // 🔽 Export CSV pour cette catégorie
  function handleExportCsv() {
    if (!rows.length) {
      alert("Aucune donnée à exporter pour cette catégorie.");
      return;
    }

    const headers = ['Nom', 'Groupe', 'Mois payés', 'Status'];
    const csvLines = [
      headers.join(','), // en-tête
      ...rows.map((row) => {
        const nom = (row.etudiant.nom || '').replace(/,/g, ' ');
        const groupe = (row.etudiant.groupe || '').replace(/,/g, ' ');
        const mois = (row.moisLabel || '').replace(/,/g, ' ');
        const statut = (row.statutLabel || '').replace(/,/g, ' ');
        return [nom, groupe, mois, statut].join(',');
      }),
    ];

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const periodLabel = `${startMonth}-${endMonth}`;
    link.href = url;
    link.setAttribute(
      'download',
      `paiements_${programmeKey}_${periodLabel}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const countLabel = rows.length;

  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-pink-700">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
          {focusedEtudiantId && rows.length === 1 && (
            <p className="text-[11px] text-pink-600 mt-1">
              🔍 Filtré sur cette étudiante.
            </p>
          )}
        </div>

        {/* Période spécifique à cette catégorie + Export */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Période :</span>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-gray-600">à</span>
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 rounded-lg border border-pink-300 bg-pink-50 px-2 py-1 hover:bg-pink-100"
          >
            📄 Exporter CSV
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
          {countLabel} étudiante{countLabel > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Chargement des données…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-500">
          Aucune étudiante ne correspond à ce filtre pour ce programme.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-pink-50">
                <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                  Nom
                </th>
                <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                  Groupe
                </th>
                <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                  Mois (payés)
                </th>
                <th className="border border-pink-100 px-2 py-1 text-left font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.etudiant.id}
                  className={
                    'hover:bg-pink-50/70 ' +
                    (focusedEtudiantId && row.etudiant.id === focusedEtudiantId
                      ? 'bg-pink-50'
                      : '')
                  }
                >
                  <td className="border border-pink-100 px-2 py-1">
                    {row.etudiant.nom || '(Sans nom)'}
                  </td>
                  <td className="border border-pink-100 px-2 py-1">
                    {row.etudiant.groupe || '-'}
                  </td>
                  <td className="border border-pink-100 px-2 py-1">
                    {row.moisLabel || '-'}
                  </td>
                  <td className="border border-pink-100 px-2 py-1">
                    {row.statutLabel || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 🔹 Composant interne qui utilise useSearchParams
function AdminPaiementEtudiantInner() {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const searchParams = useSearchParams();
  const focusedEtudiantId = searchParams.get('etudianteId');

  // 🔁 Charger étudiantes + paiements
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const [{ data: etuData, error: etuError }, { data: payData, error: payError }] =
        await Promise.all([
          supabase
            .from('etudiants')
            .select('id, nom, telephone, programme, groupe')
            .order('nom', { ascending: true }),
          supabase.from('paiements').select('id, etudiant_id, mois, statut'),
        ]);

      if (etuError || payError) {
        console.error('Erreur chargement paiement-etudiant:', etuError, payError);
        setError("Erreur lors du chargement des données (étudiants ou paiements).");
        setEtudiants([]);
        setPaiements([]);
      } else {
        setEtudiants((etuData || []) as Etudiant[]);
        setPaiements((payData || []) as Paiement[]);
      }

      setLoading(false);
    }

    void loadData();
  }, []);

  const focusedEtudiante =
    focusedEtudiantId &&
    etudiants.find((e) => e.id === focusedEtudiantId) != null
      ? etudiants.find((e) => e.id === focusedEtudiantId)!
      : null;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-pink-700">
              Paiement étudiant
            </h1>
            <p className="text-sm text-gray-600">
              Résumé des paiements des étudiantes par catégorie. Chaque
              catégorie a sa propre période, tu peux aussi filtrer par statut.
            </p>
            {focusedEtudiante && (
              <p className="mt-1 text-xs text-pink-700">
                🎯 Vue centrée sur :{' '}
                <span className="font-semibold">
                  {focusedEtudiante.nom || '(Sans nom)'}
                </span>
              </p>
            )}
            {error && (
              <p className="mt-1 text-xs text-red-600">❌ {error}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-xs">
            <Link
              href="/admin/paiements"
              className="px-3 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
            >
              ⬅️ Page Paiements
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Filtre global Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="text-gray-600 max-w-md">
            Une étudiante est considérée <strong>Payée</strong> pour une
            période donnée seulement si <strong>tous les mois</strong> de cette
            période sont marqués comme payés. S&apos;il manque un seul mois, elle
            est marquée <strong>Non payé</strong>. Tu peux aussi exporter les
            données de chaque catégorie en CSV.
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-600">Afficher :</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              className="border rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">Tous</option>
              <option value="paye">Payés</option>
              <option value="non_paye">Non payés</option>
            </select>
          </div>
        </div>

        {/* 3 catégories */}
        <div className="space-y-4">
          <CategoryBlock
            title="Maquillage"
            description="Étudiantes inscrites dans la catégorie Maquillage."
            programmeKey="maquillage"
            etudiants={etudiants}
            paiements={paiements}
            statusFilter={statusFilter}
            loading={loading}
            focusedEtudiantId={focusedEtudiantId}
          />

          <CategoryBlock
            title="Cosmétologie"
            description="Étudiantes inscrites dans la catégorie Cosmétologie."
            programmeKey="cosmetologie"
            etudiants={etudiants}
            paiements={paiements}
            statusFilter={statusFilter}
            loading={loading}
            focusedEtudiantId={focusedEtudiantId}
          />

          <CategoryBlock
            title="Décoration"
            description="Étudiantes inscrites dans la catégorie Décoration."
            programmeKey="decoration"
            etudiants={etudiants}
            paiements={paiements}
            statusFilter={statusFilter}
            loading={loading}
            focusedEtudiantId={focusedEtudiantId}
          />
        </div>
      </div>
    </div>
  );
}

// 🔹 Composant exporté : wrapper avec Suspense
export default function AdminPaiementEtudiantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
          Chargement des paiements…
        </div>
      }
    >
      <AdminPaiementEtudiantInner />
    </Suspense>
  );
}
