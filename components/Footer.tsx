// components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-pink-500 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-bold">Kisa Beauty School</h3>
          <p className="text-white/90 mt-2">
            “Kisa un jour, Kisa toujours”
          </p>
        </div>

        <div>
          <h4 className="font-semibold">Contacts</h4>
          <ul className="mt-2 space-y-1 text-white/90">
            <li>Email : <a className="underline hover:opacity-90" href="mailto:walkisep@gmail.com">walkisep@gmail.com</a></li>
            <li>Tél : +509 4116-3845 / +509 3823-5518</li>
            <li>Adresse : Kafou baz normal, Rue des Marthys, Ouanaminthe, Haïti HT2210</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Liens</h4>
          <ul className="mt-2 space-y-1">
            <li><Link className="hover:opacity-90 underline" href="/">Accueil</Link></li>
            <li><Link className="hover:opacity-90 underline" href="/apropos">À propos</Link></li>
            <li><Link className="hover:opacity-90 underline" href="/contact">Contact</Link></li>
            <li><Link className="hover:opacity-90 underline" href="/inscription">Inscription</Link></li>
            <li><Link className="hover:opacity-90 underline" href="/galerie">Galerie</Link></li>
            <li><Link className="hover:opacity-90 underline" href="/publication">Magazine</Link></li>

          </ul>
        </div>
      </div>

      <div className="border-t border-white/20">
        <p className="mx-auto max-w-6xl px-6 py-4 text-sm text-white/80">
          © {new Date().getFullYear()} Kisa Beauty School — Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
