import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.kisabeautyschool.education';
  const now = new Date();

  return [
    { url: `${base}/`,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/inscription`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/contact`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/galerie`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/temoignages`,    lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    // ajoute d'autres URLs publiques si besoin
  ];
}
