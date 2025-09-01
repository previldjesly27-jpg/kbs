import Link from 'next/link';

export const metadata = {
  title: 'Inscription réussie',
  robots: { index: false, follow: false }, // évite l’indexation
};

type Props = {
  searchParams: {
    nom?: string;
    email?: string;
    programme?: string;
    ref?: string; // identifiant/numéro si tu en passes un
  };
};

export default function SuccessPage({ searchParams }: Props) {
  const { nom, email, programme, ref } = searchParams;

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border">
          {/* icône check */}
          <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
            <path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Inscription envoyée avec succès</h1>
        <p className="text-gray-600">
          Merci{nom ? `, ${nom}` : ''}! Nous avons bien reçu ta demande
          {programme ? ` pour le programme « ${programme} »` : ''}.
        </p>

        <div className="mt-4 text-sm text-gray-600 space-y-1">
          {email && <p>Email : <span className="font-medium">{email}</span></p>}
          {ref && <p>Référence : <span className="font-medium">{ref}</span></p>}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-5 py-2 rounded-xl border hover:shadow">Retour à l’accueil</Link>
          <Link href="/inscription" className="px-5 py-2 rounded-xl bg-black text-white hover:shadow">Nouvelle inscription</Link>
          <Link href="/contact" className="px-5 py-2 rounded-xl border hover:shadow">Contacter l’école</Link>
        </div>

        <button
          onClick={() => window.print()}
          className="mt-6 text-sm underline"
        >
          Imprimer le reçu
        </button>
      </div>
    </main>
  );
}
