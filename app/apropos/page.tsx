import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
export default function AproposPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <section className="mx-auto max-w-4xl px-6 py-16 space-y-6">
        <h1 className="text-4xl font-bold text-pink-500 mb-4">
          À propos de Kisa Beauty School
        </h1>

        <p className="text-lg text-pink-500">
          Kisa Beauty School (KBS) est une école de formation professionnelle à Ouanaminthe, Haïti.
          Nous formons une nouvelle génération de jeunes talents dans les domaines de la beauté,
          de la création artistique et du soin esthétique.
        </p>

        <p className="text-lg text-pink-500">
          Notre mission est d’offrir un cadre propice à l’apprentissage, à la créativité et à la
          réussite, avec des formations certifiantes en Maquillage, Cosmétologie et Décoration
          événementielle.
        </p>

        <p className="text-lg italic text-pink-600 font-semibold">
          “Kisa un jour, Kisa toujours”
        </p>
      </section>
      <Footer />

    </main>
  );
}
