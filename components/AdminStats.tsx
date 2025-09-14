// components/AdminStats.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const PROGS = ["maquillage", "cosmetologie", "decoration"] as const;
type Prog = typeof PROGS[number];

type Counts = {
  total: number;
  actifs: number;
  archives: number;
  semaine: number;
  weekend: number;
  maquillage: number;
  cosmetologie: number;
  decoration: number;
  byProg: Record<Prog, { semaine: number; weekend: number; total: number }>;
};

async function count(table: string, filter?: (q: any) => any) {
  let q: any = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

function labelProg(p: Prog) {
  if (p === "maquillage") return "Maquillage";
  if (p === "cosmetologie") return "Cosmétologie";
  return "Décoration";
}

export default function AdminStats() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const total    = await count("etudiants");
      const actifs   = await count("etudiants", q => q.eq("statut", "actif"));
      const archives = await count("etudiants", q => q.eq("statut", "archive"));

      const semaine  = await count("etudiants", q => q.or("groupe.eq.semaine,groupe.eq.1"));
      const weekend  = await count("etudiants", q => q.or("groupe.eq.weekend,groupe.eq.2"));

      const maquillage   = await count("etudiants", q => q.or("programme.eq.maquillage,specialites.cs.{maquillage}"));
      const cosmetologie = await count("etudiants", q => q.or("programme.eq.cosmetologie,specialites.cs.{cosmetologie}"));
      const decoration   = await count("etudiants", q => q.or("programme.eq.decoration,specialites.cs.{decoration}"));

      const byProg: Counts["byProg"] = {
        maquillage:   { semaine: 0, weekend: 0, total: 0 },
        cosmetologie: { semaine: 0, weekend: 0, total: 0 },
        decoration:   { semaine: 0, weekend: 0, total: 0 },
      };

      const countProgGroup = (p: Prog, g: "semaine" | "weekend") => {
        const progOr = `programme.eq.${p},specialites.cs.{${p}}`;
        const grpOr  = g === "weekend" ? "groupe.eq.weekend,groupe.eq.2" : "groupe.eq.semaine,groupe.eq.1";
        return count("etudiants", q => q.or(progOr).or(grpOr));
      };

      for (const p of PROGS) {
        const [s, w] = await Promise.all([countProgGroup(p, "semaine"), countProgGroup(p, "weekend")]);
        byProg[p] = { semaine: s, weekend: w, total: s + w };
      }

      setC({ total, actifs, archives, semaine, weekend, maquillage, cosmetologie, decoration, byProg });
    })();
  }, []);

  if (!c) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="h-24 rounded-2xl bg-pink-50 animate-pulse" />
        <div className="h-24 rounded-2xl bg-pink-50 animate-pulse" />
        <div className="h-24 rounded-2xl bg-pink-50 animate-pulse" />
      </div>
    );
  }

  const Card = ({ title, value, sub }: { title: string; value: number; sub?: string }) => (
    <div className="rounded-2xl border border-pink-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-pink-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-pink-600">{value}</p>
      {sub && <p className="mt-1 text-xs text-pink-400">{sub}</p>}
    </div>
  );

  return (
    <div className="mb-6 text-pink-700">
      {/* Tuiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card title="Étudiants (total)" value={c.total} />
        <Card title="Actifs" value={c.actifs} />
        <Card title="Archivés" value={c.archives} />
        <Card title="Groupe Semaine" value={c.semaine} sub="(1 ou 'semaine')" />
        <Card title="Groupe Weekend" value={c.weekend} sub="(2 ou 'weekend')" />
      </div>

      {/* Tableau croisé */}
      <div className="rounded-2xl border border-pink-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-pink-50 text-pink-700">
            <tr className="text-left">
              <th className="px-4 py-2">Programme</th>
              <th className="px-4 py-2">Semaine</th>
              <th className="px-4 py-2">Weekend</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {PROGS.map((p) => (
              <tr key={p} className="hover:bg-pink-50/50">
                <td className="px-4 py-2 font-medium">{labelProg(p)}</td>
                <td className="px-4 py-2">{c.byProg[p].semaine}</td>
                <td className="px-4 py-2">{c.byProg[p].weekend}</td>
                <td className="px-4 py-2 font-semibold text-pink-600">{c.byProg[p].total}</td>
              </tr>
            ))}
            <tr className="bg-pink-50/60">
              <td className="px-4 py-2 font-semibold">Total</td>
              <td className="px-4 py-2">{PROGS.reduce((s, p) => s + c.byProg[p].semaine, 0)}</td>
              <td className="px-4 py-2">{PROGS.reduce((s, p) => s + c.byProg[p].weekend, 0)}</td>
              <td className="px-4 py-2 font-bold text-pink-600">
                {PROGS.reduce((s, p) => s + c.byProg[p].total, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
