// app/robots.ts
import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kisabeautyschool.education";

export default function robots(): MetadataRoute.Robots {
  const host = new URL(BASE_URL).host; // ex: kisabeautyschool.education ou www.kisabeautyschool.education
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/inscription/success"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host, // sans protocole
  };
}
