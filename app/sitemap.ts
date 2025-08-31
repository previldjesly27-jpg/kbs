// app/sitemap.ts
import type { MetadataRoute } from "next";

const baseUrl = "https://kisabeautyschool.education";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${baseUrl}/`,             lastModified: now, changeFrequency: "weekly",  priority: 1 },
    { url: `${baseUrl}/inscription`,  lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${baseUrl}/galerie`,      lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${baseUrl}/temoignages`,  lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${baseUrl}/contact`,      lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
