// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kisa Beauty School",
    template: "%s • Kisa Beauty School",
  },
  applicationName: "Kisa Beauty School",
  description:
    "Kisa Beauty School (KBS) — École professionnelle à Ouanaminthe, Haïti : maquillage, cosmétologie, décoration événementielle.",
  themeColor: "#ec4899",
  icons: { icon: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }] },
  appleWebApp: {
    title: "Kisa Beauty School",
    capable: true,
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
