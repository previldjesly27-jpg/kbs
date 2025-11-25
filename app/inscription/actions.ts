"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function ajouterInscription(formData: FormData) {
  const nom = String(formData.get("nom") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const telephone = String(formData.get("telephone") || "").trim();

  // 🔹 Programme : "semaine" | "weekend"
  const programmeRaw = String(formData.get("programme") || "").toLowerCase().trim();
  const programmeLabel =
    programmeRaw === "semaine"
      ? "Semaine"
      : programmeRaw === "weekend"
      ? "Weekend"
      : programmeRaw || "Non précisé";

  // 🔹 Spécialités
  const rawSpecialites = formData.getAll("specialites") || [];
  const specialitesList = rawSpecialites
    .map((v) => String(v).toLowerCase().trim())
    .filter(Boolean)
    .map((v) => {
      if (v === "maquillage") return "Maquillage";
      if (v === "cosmetologie") return "Cosmétologie";
      if (v === "decoration") return "Décoration";
      return v;
    });

  const specialitesLabel =
    specialitesList.length > 0 ? specialitesList.join(", ") : "Non spécifiées";

  const resumeProgramme = `${specialitesLabel} / ${programmeLabel}`;

  const rawAdmins = process.env.ADMIN_EMAILS || "";
  const adminEmails = rawAdmins
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  console.log("➡ [ajouterInscription] appelée");
  console.log("  Nom =", nom);
  console.log("  Email étudiant =", email);
  console.log("  Téléphone =", telephone);
  console.log("  Spécialités =", specialitesLabel);
  console.log("  Programme =", programmeLabel);
  console.log("  ADMIN_EMAILS =", adminEmails);
  console.log("  EMAIL_FROM =", process.env.EMAIL_FROM);

  try {
    // 📨 1) Email ADMIN
    if (adminEmails.length > 0) {
      const adminResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: adminEmails,
        subject: `Nouvelle inscription - ${resumeProgramme}`,
        text: `Une nouvelle inscription a été reçue sur le site Kisa Beauty School :

Nom : ${nom}
Email : ${email || "non fourni"}
Téléphone : ${telephone || "non fourni"}

Programmes / spécialités : ${specialitesLabel}
Option de formation : ${programmeLabel}

Connecte-toi dans l'espace admin pour voir plus de détails.`,
      });
      console.log("✅ Email ADMIN envoyé :", adminResult);
    } else {
      console.log("⚠ Aucun admin configuré dans ADMIN_EMAILS.");
    }

    // 📨 2) Email ÉTUDIANT (accusé de réception)
    if (email) {
      const studentResult = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: [email],
        subject: "Nous avons bien reçu votre inscription - Kisa Beauty School",
        text: `Bonjour ${nom},

Nous avons bien reçu votre inscription à Kisa Beauty School ✅

📚 Programmes / spécialités : ${specialitesLabel}
🕒 Option de formation : ${programmeLabel}

Notre équipe va vous contacter très bientôt pour la suite :
- Informations sur le début des cours
- Détails de paiement
- Organisation pratique

Adresse : Rue des Marthys, Ouanaminthe, Haïti
WhatsApp : +509 4116-3845 / +509 3823-5518

"Kisa un jour, Kisa toujours" 🩷

Kisa Beauty School`,
      });
      console.log("✅ Email ÉTUDIANT envoyé :", studentResult);
    } else {
      console.log("⚠ Aucun email étudiant fourni, accusé NON envoyé.");
    }
  } catch (err) {
    console.error("❌ Erreur envoi email (admin ou étudiant) :", err);
    // on ne bloque pas l'utilisateur, l'inscription est déjà faite côté Supabase
  }
}
