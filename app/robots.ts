import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://www.kisabeautyschool.education';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/inscription/success'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
