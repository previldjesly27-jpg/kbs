import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PrintButton from '@/components/PrintButton';

export const metadata: Metadata = {
  title: 'Inscription réussie',
  robots: { index: false, follow: false },
};

// searchParams peut être un objet OU une Promise sous Next 15
type SP = Record<string, string | string[] | undefined>;
const val = (sp: SP, k: string) => {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v || '';
};
const pickPhone = (sp: SP) => {
  for (const k of ['telephone', 'tel', 'phone', 'numero', 'num']) {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] as string;
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};
const safe = (s?: string) => (s && s.trim().length ? s : '—');

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SP> | SP;
}) {
  // Résout Promise OU renvoie l'objet tel quel
  const sp = await Promise.resolve(searchParams ?? {});
  const nom = val(sp, 'nom');
  const email = val(sp, 'email');
  const programme = val(sp, 'programme');
  const telephone = pickPhone(sp);

  return (
    <>
      <Navbar />

      {/* Fond rose & blanc */}
      <div className="min-h-[70vh] bg-gradient-to-b from-pink-50 to-white flex items-center justify-center px-4 py-12">
        <main className="w-full max-w-2xl">
          <section className="bg-white rounded-2xl shadow-xl ring-1 ring-pink-100/60 p-8 md:p-10 text-center">
            {/* Icône check */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-pink-100">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-pink-600" aria-hidden="true">
                <path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Inscription envoyée avec succès
            </h1>
            <p className="mt-4 md:mt-5 text-lg md:text-xl leading-relaxed text-slate-800">
              Merci pour votre inscription.{' '}
              <span className="font-semibold text-pink-700">Nous vous contacterons dès que possible.</span>
            </p>

            {/* Détails toujours visibles */}
            <div className="mt-6 md:mt-7 space-y-1.5 text-base md:text-lg text-slate-800 text-left sm:text-center">
              <p><span className="text-slate-500">Nom :</span> <span className="font-medium text-pink-700">{safe(nom)}</span></p>
              <p><span className="text-slate-500">Téléphone :</span> <span className="font-medium">{safe(telephone)}</span></p>
              <p><span className="text-slate-500">Email :</span> <span className="font-medium">{safe(email)}</span></p>
              <p><span className="text-slate-500">Programme :</span> <span className="font-medium">{safe(programme)}</span></p>
            </div>

            {/* Boutons */}
            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/" className="px-5 py-2.5 rounded-xl bg-white text-pink-700 ring-1 ring-pink-200 hover:ring-pink-300 hover:shadow-sm transition">Retour à l’accueil</a>
              <a href="/inscription" className="px-5 py-2.5 rounded-xl bg-pink-600 text-white hover:bg-pink-700 shadow-sm transition">Nouvelle inscription</a>
              <a href="/contact" className="px-5 py-2.5 rounded-xl bg-white text-pink-700 ring-1 ring-pink-200 hover:ring-pink-300 hover:shadow-sm transition">Contacter l’école</a>
            </div>

            <div className="mt-6">
              <PrintButton />
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
