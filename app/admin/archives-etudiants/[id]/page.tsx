'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type ArchiveEtudiant = {
  id: string;
  nom: string | null;
  email?: string | null;
  telephone?: string | null;
  programme?: string | null;
  groupe?: string | null;
  date_naissance?: string | null;
  statut?: string | null;
  created_at: string;
  // on laisse les autres champs dans "any" via données brutes
  [key: string]: any;
};

export default function ArchiveEtudiantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [etu, setEtu] = useState<ArchiveEtudiant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  // 🔁 Charger l'étudiante archivée
  useEffect(() => {
    async function loadEtudiante() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('etudiants_archive')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Erreur lecture etudiants_archive:', error);
        setError("Impossible de trouver cette étudiante archivée.");
        setEtu(null);
      } else {
        setEtu(data as ArchiveEtudiant);
      }

      setLoading(false);
    }

    if (id) {
      void loadEtudiante();
    }
  }, [id]);

  // 📦 Réinscrire dans la table etudiants
  async function handleReinscrire() {
    if (!etu) return;
    setActionLoading(true);
    setActionError(null);

    // On enlève l'ancien id / created_at
    const { id: _oldId, created_at: _oldCreatedAt, ...rest } = etu;

    const insertData = {
      ...rest,
      statut: rest.statut || 'actif',
    };

    const { error } = await supabase.from('etudiants').insert(insertData);

    if (error) {
      console.error('Erreur insertion dans etudiants:', error);
      setActionError(
        "Erreur pendant la réinscription. Vérifie la table 'etudiants' ou les règles RLS."
      );
      setActionLoading(false);
      return;
    }

    // Succès : on redirige vers la page Étudiants
    router.push('/admin/etudiants');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-600">Chargement de l&apos;étudiante archivée…</p>
      </div>
    );
  }

  if (error || !etu) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-3">
          <p className="text-sm text-red-600">
            {error || "Impossible de trouver cette étudiante archivée."}
          </p>
          <Link
            href="/admin/archives-etudiants"
            className="text-xs text-pink-700 hover:underline"
          >
            ⬅️ Retour aux archives étudiantes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-pink-700">
              Détail étudiante archivée
            </h1>
            <p className="text-sm text-gray-600">
              Informations complètes de l&apos;étudiante provenant de{' '}
              <code>etudiants_archive</code>.
            </p>
            {actionError && (
              <p className="mt-1 text-xs text-red-600">❌ {actionError}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-xs">
            <Link
              href="/admin/archives-etudiants"
              className="px-3 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
            >
              ⬅️ Archives étudiantes
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1 rounded-lg bg-gray-800 text-white hover:bg-gray-900"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-4">
          <div className="border-b border-pink-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {etu.nom || '(Nom non renseigné)'}
              </h2>
              {etu.programme && (
                <p className="text-sm text-pink-700 font-medium">
                  Programme : {etu.programme}
                </p>
              )}
              {etu.groupe && (
                <p className="text-xs text-gray-500">
                  Groupe : {etu.groupe}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>ID (archive) : {etu.id}</p>
              <p>Archivée le : {formatDate(etu.created_at)}</p>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1 text-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                Coordonnées
              </h3>
              <p>
                <span className="font-medium">Téléphone : </span>
                {etu.telephone || '-'}
              </p>
              <p>
                <span className="font-medium">Email : </span>
                {etu.email || '-'}
              </p>
            </div>

            <div className="space-y-1 text-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                Informations scolaires
              </h3>
              {etu.date_naissance && (
                <p>
                  <span className="font-medium">Date de naissance : </span>
                  {formatDate(etu.date_naissance)}
                </p>
              )}
              {etu.statut && (
                <p>
                  <span className="font-medium">Statut : </span>
                  {etu.statut}
                </p>
              )}
            </div>
          </div>

          {/* 🌟 Bouton spécial : réinscrire pour nouvelle année */}
          <div className="pt-4 border-t border-pink-100 flex justify-end">
            <button
              type="button"
              onClick={handleReinscrire}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-pink-600 text-white text-xs sm:text-sm px-4 py-2 hover:bg-pink-700 shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Réinscription en cours…' : '📦 Réinscrire cette étudiante pour la nouvelle année'}
            </button>
          </div>

          
        </div>
      </div>
    </div>
  );
}
