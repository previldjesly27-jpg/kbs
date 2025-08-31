// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kisa Beauty School",
    template: "%s • Kisa Beauty School",
  },
  description:
    "Kisa Beauty School (KBS) — École professionnelle à Ouanaminthe, Haïti : maquillage, cosmétologie, décoration événementielle.",
  icons: {
    icon: [
      { url: "/icon.png" },                // si tu as app/icon.png
      { url: "/favicon.ico" },            // optionnel si présent
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }, // optionnel
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }, // optionnel
    ],
    apple: [{ url: "/apple-touch-icon.png" }], // optionnel si présent
  },
  openGraph: {
    title: "Kisa Beauty School",
    siteName: "Kisa Beauty School",
    url: "https://www.kisabeautyschool.education",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kisa Beauty School",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
