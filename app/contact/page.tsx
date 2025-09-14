import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SocialLinks from '@/components/SocialLinks';

export default function ContactPage() {
  
  return (
    
    <main className="min-h-screen bg-white">
      <Navbar />
      
      <section className="mx-auto max-w-4xl px-6 py-16 space-y-8">
        <h1 className="text-4xl font-bold text-pink-500">Contactez-nous</h1>

        <div className="space-y-3 text-pink-500">
          <p><strong>Email :</strong> walkisep@gmail.com</p>
          <p><strong>Téléphone :</strong> +509 4116-3845 / +509 3823-5518</p>
          <p><strong>Adresse :</strong> Rue des Marthys, Ouanaminthe, Haïti HT2210</p>
        </div>

        <form className="space-y-4 bg-pink-500 p-6 rounded-xl shadow-md">
  <input
    type="text"
    placeholder="Nom"
    className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
  />
  <input
    type="email"
    placeholder="Email"
    className="w-full border border-pink-300 rounded-lg px-3 py-2 bg-pink-400 text-white placeholder-white"
  />
  <textarea
    placeholder="Message"
    className="w-full border border-pink-300 rounded-lg px-3 py-2 min-h-[120px] bg-pink-400 text-white placeholder-white"
  />
  <button
    type="submit"
    className="bg-white text-pink-500 px-6 py-2 rounded-xl hover:bg-gray-100 transition font-semibold"
  >
    Envoyer
  </button>
</form>
<SocialLinks />
      </section>
      <Footer />
      

    </main>
  );
}
