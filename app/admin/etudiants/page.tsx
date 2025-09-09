"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Statut = "actif" | "termine" | "suspendu";
type Filiere = "maquillage" | "cosmetologie" | "decoration";
type Groupe = "semaine" | "weekend";

type Row = {
  id: string;
  created_at: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  filiere: Filiere | null;     // ← Programme (filière)
  groupe: Groupe | null;       // ← Horaire (Semaine/Weekend)
  statut: Statut | null;
};

const FILIERE_LABEL = (v?: string | null) =>
  v === "cosmetologie" ? "Cosmétologie" :
  v === "decoration"   ? "Décoration"   :
  v === "maquillage"   ? "Maquillage"   : "—";

const GROUPE_LABEL = (v?: string | null) =>
  (v || "semaine").toLowerCase() === "weekend" ? "Weekend" : "Semaine";

export default function AdminEtudiantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // recherche + filtres
  const [q, setQ] = useState("");
  const [statutFilter, setStatutFilter] = useState<"all" | Statut>("all");
  const [filiereFilter, setFiliereFilter] = useState<"all" | Filiere>("all");
  const [groupeFilter, setGroupeFilter] = useState<"all" | Groupe>("all");

  // création rapide
  const [addOpen, setAddOpen] = useState(false);
  const [addNom, setAddNom] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addTel, setAddTel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("etudiants")
      .select("id, created_at, nom, email, telephone, filiere, groupe, statut")
      .order("created_at", { ascending: false });
    if (error) { setErr(error.message); setRows([]); }
    else { setRows((data ?? []) as Row[]); }
    setLoading(false);
  }

  const goToDetail = (id: string) => router.push(`/admin/etudiants/${id}`);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet étudiant ?")) return;
    const { error } = await supabase.from("etudiants").delete().eq("id", id);
    if (error) return alert(error.message);
    setRows(prev => prev.filter(r => r.id !== id));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  const view = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows
      .filter(r => statutFilter === "all" ? true : (r.statut || "actif") === statutFilter)
      .filter(r => filiereFilter === "all" ? true : r.filiere === filiereFilter)
      .filter(r => groupeFilter === "all" ? true : r.groupe === groupeFilter)
      .filter(r => {
        if (!ql) return true;
        const hay = [r.nom, r.email, r.telephone, r.filiere || "", r.groupe || ""].join(" ").toLowerCase();
        return hay.includes(ql);
      });
  }, [rows, q, statutFilter, filiereFilter, groupeFilter]);

  async function addStudent() {
    if (!addNom.trim()) return alert("Nom obligatoire");
    setAdding(true);
    const { data, error } = await supabase
      .from("etudiants")
      .insert({ nom: addNom.trim(), email: addEmail.trim() || null, telephone: addTel.trim() || null, statut: "actif" })
      .select("id")
      .single();
    setAdding(false);
    if (error) return alert(error.message);
    setAddNom(""); setAddEmail(""); setAddTel(""); setAddOpen(false);
    router.push(`/admin/etudiants/${data!.id}`);
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full px-3 sm:px-6 py-4 text-pink-700">
        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-pink-500">Étudiants</h1>
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-72 border border-pink-300 rounded-lg px-3 py-1.5 placeholder-pink-400"
            />

            <select value={filiereFilter} onChange={(e)=>setFiliereFilter(e.target.value as any)}
              className="border border-pink-300 text-pink-700 px-3 py-1.5 rounded-lg">
              <option value="all">Toutes filières</option>
              <option value="maquillage">Maquillage</option>
              <option value="cosmetologie">Cosmétologie</option>
              <option value="decoration">Décoration</option>
            </select>

            <select value={groupeFilter} onChange={(e)=>setGroupeFilter(e.target.value as any)}
              className="border border-pink-300 text-pink-700 px-3 py-1.5 rounded-lg">
              <option value="all">Tous groupes</option>
              <option value="semaine">Semaine</option>
              <option value="weekend">Weekend</option>
            </select>

            <select value={statutFilter} onChange={(e)=>setStatutFilter(e.target.value as any)}
              className="border border-pink-300 text-pink-700 px-3 py-1.5 rounded-lg">
              <option value="all">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
              <option value="suspendu">Suspendu</option>
            </select>

            <Link href="/admin" className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">← Dashboard</Link>
            <button onClick={() => setAddOpen(o => !o)} className="bg-pink-600 text-white px-3 py-1.5 rounded-lg hover:bg-pink-700">
              {addOpen ? "Fermer" : "Ajouter"}
            </button>
            <button onClick={() => void load()} className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">
              Rafraîchir
            </button>
            <button onClick={() => void handleLogout()} className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">
              Déconnexion
            </button>
          </div>
        </div>

        {addOpen && (
          <div className="mb-4 rounded-xl border border-pink-200 p-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <input value={addNom} onChange={(e)=>setAddNom(e.target.value)} placeholder="Nom *" className="border border-pink-300 rounded-lg px-3 py-2"/>
              <input value={addEmail} onChange={(e)=>setAddEmail(e.target.value)} placeholder="Email" type="email" className="border border-pink-300 rounded-lg px-3 py-2"/>
              <input value={addTel} onChange={(e)=>setAddTel(e.target.value)} placeholder="Téléphone" className="border border-pink-300 rounded-lg px-3 py-2"/>
            </div>
            <div className="mt-3">
              <button onClick={addStudent} disabled={adding} className="bg-pink-600 text-white px-4 py-2 rounded-xl hover:bg-pink-700 disabled:opacity-60">
                {adding ? "Ajout…" : "Créer l’étudiant"}
              </button>
            </div>
          </div>
        )}

        <div className="h-[calc(100vh-260px)] overflow-auto rounded-xl border">
          <table className="w-full table-auto text-sm text-pink-700">
            <thead className="bg-pink-50 text-pink-700 sticky top-0 z-10">
  <tr className="text-left">
    <th className="px-4 py-2 whitespace-nowrap">Créé</th>
    <th className="px-4 py-2">Nom</th>
    <th className="px-4 py-2">Email</th>
    <th className="px-4 py-2">Téléphone</th>
    <th className="px-4 py-2">Programme</th>
    <th className="px-4 py-2">Groupe</th>
    <th className="px-4 py-2">Statut</th>
    <th className="px-4 py-2">Actions</th>
  </tr>
</thead>

            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-4 text-pink-500" colSpan={8}>Chargement…</td></tr>
              ) : view.length === 0 ? (
                <tr><td className="px-4 py-6 text-pink-500" colSpan={8}>Aucun étudiant.</td></tr>
              ) : (
                view.map((r) => (
                  <tr key={r.id} className="align-top cursor-pointer hover:bg-pink-50" onClick={() => goToDetail(r.id)}>
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-2 truncate">{r.nom}</td>
                    <td className="px-4 py-2 truncate">{r.email ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.telephone || "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{FILIERE_LABEL(r.filiere)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{GROUPE_LABEL(r.groupe)}</td>
                    <td className="px-4 py-2">
                      {(r.statut || "actif").replace("actif","Actif").replace("termine","Terminé").replace("suspendu","Suspendu")}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button onClick={(e)=>{e.stopPropagation(); goToDetail(r.id);}}
                        className="border border-pink-300 text-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-50">
                        Ouvrir
                      </button>
                      <button onClick={(e)=>{e.stopPropagation(); void handleDelete(r.id);}}
                        className="bg-pink-600 text-white px-3 py-1.5 rounded-lg hover:bg-pink-700">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
