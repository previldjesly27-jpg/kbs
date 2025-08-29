import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic"; // évite le prerender statique

export default function AdminLoginPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-pink-600 mb-6">Connexion Admin</h1>

        {/* ⬇️ on entoure le composant qui utilise useSearchParams */}
        <Suspense fallback={<div className="text-pink-600">Chargement…</div>}>
          <LoginClient />
        </Suspense>

        <div className="mt-6">
          <Link href="/" className="underline text-pink-600">← Accueil</Link>
        </div>
      </main>
    </>
  );
}
