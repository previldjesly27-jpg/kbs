import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import HomeTriptych from "@/components/HomeTriptych";

export default function HomePage() {
  return (
    
    <main className="min-h-screen bg-white">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex justify-center mb-4">

  <Image
    src="/logo-kbs.png"
    alt="Kisa Beauty School"
    width={200}
    height={200}
    className="rounded-full bg-white p-1"
    priority
  />
</div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-pink-500 mb-8 text-center">
          Bienvenue à Kisa Beauty School
        </h1>

        <p className="text-lg text-pink-500 mb-6">
          Bienvenue à Kisa Beauty School (KBS), une école de formation professionnelle située à
          Ouanaminthe, Haïti. Depuis plus de 5 ans, nous formons avec passion et rigueur une
          nouvelle génération de jeunes talents dans les domaines de la beauté, de la création
          artistique et du soin esthétique.
        </p>

        <p className="text-lg text-pink-500 mb-6">
          Notre établissement propose des formations complètes et certifiantes dans plusieurs
          spécialités :
        </p>

        <ul className="list-disc list-inside text-lg text-pink-500 mb-6 space-y-2">
          <li>Maquillage professionnel</li>
          <li>Cosmétologie moderne</li>
          <li>Décoration événementielle</li>
        </ul>

        <p className="text-lg text-pink-500 mb-6">
          Chez KBS, nous croyons que chaque étudiant(e) mérite un cadre propice à l’apprentissage, à la
          créativité et à la réussite. Notre équipe pédagogique expérimentée vous accompagne à chaque
          étape de votre parcours pour faire de votre passion un métier d’avenir.
        </p>

        <p className="text-xl font-semibold text-pink-600 italic mb-6 text-center">
          💬 “Kisa un jour, Kisa toujours” — notre slogan symbolise l’engagement et la fierté
          d’appartenir à une communauté dynamique et inspirante.
        </p>

        <p className="text-lg text-pink-500 text-center">
          Rejoignez-nous aujourd’hui et transformez vos rêves en carrière professionnelle.
        </p>
        <div className="mt-6">
  <Link
    href="/inscription"
    className="inline-block bg-pink-500 text-white px-6 py-3 rounded-xl shadow hover:bg-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500 transition"
  >
    S’inscrire maintenant
  </Link>
</div>
{/* 3 carrés : Maquillage / Cosmétologie / Décoration – rotation toutes les 15s */}
      <HomeTriptych />

      </section>
      <Footer />
    </main>
  );
}
