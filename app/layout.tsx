// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://kisabeautyschool.education";
const siteName = "Kisa Beauty School";
const siteDesc =
  "Kisa Beauty School (KBS) — école professionnelle à Ouanaminthe, Haïti. Formations certifiantes en Maquillage, Cosmétologie et Décoration événementielle.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | Kisa Beauty School",
  },
  description: siteDesc,
  keywords: [
    "Kisa Beauty School",
    "École de beauté Haïti",
    "Maquillage",
    "Cosmétologie",
    "Décoration événementielle",
    "Ouanaminthe",
    "Formation professionnelle",
  ],
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDesc,
    images: [
      {
        url: "/logo-og.png", // 1200x630 recommandé
        width: 1200,
        height: 630,
        alt: "Kisa Beauty School",
      },
    ],
    locale: "fr_HT",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDesc,
    images: ["/logo-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Si tu veux aussi valider la Search Console par meta (optionnel) :
  // Remplace le token ci-dessous, ou supprime la ligne si inutile
  verification: {
    google: "", // ← colle ici ton token si tu veux (sinon, laisse vide ou supprime)
  },
  applicationName: siteName,
  themeColor: "#f3129b", // rose de ta charte
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      // Ajoute tes réseaux si tu veux
    ],
  };

  return (
    <html lang="fr">
      <body>
        {/* JSON-LD (SEO) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
