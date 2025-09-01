// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SchemaOrg from "@/components/SchemaOrg";

const siteUrl = "https://kisabeautyschool.education";
const siteName = "Kisa Beauty School";
const siteDesc =
  "Kisa Beauty School (KBS) — école professionnelle à Ouanaminthe, Haïti. Formations certifiantes en Maquillage, Cosmétologie et Décoration événementielle.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: "%s | Kisa Beauty School" },
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
  alternates: { canonical: "/" }, // (optionnel) tu peux laisser siteUrl si tu préfères
  themeColor: "#f3129b",
  icons: {
    icon: [
      { url: "/favicon.ico" },
            { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' }, // 👈 ajout
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDesc,
    images: [{ url: "/logo-og.png", width: 1200, height: 630, alt: "Kisa Beauty School" }],
    locale: "fr_HT",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDesc,
    images: ["/logo-og.png"],
  },
  robots: { index: true, follow: true },
  applicationName: siteName,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <SchemaOrg />
      </body>
    </html>
  );
}
