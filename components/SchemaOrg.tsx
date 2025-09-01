import Script from 'next/script';

export default function SchemaOrg() {
  const data = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Kisa Beauty School",
    "url": "https://www.kisabeautyschool.education",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rue des Marthys, Kafou baz normal",
      "addressLocality": "Ouanaminthe",
      "addressRegion": "Nord-Est",
      "postalCode": "HT2210",
      "addressCountry": "HT"
    },
    "telephone": "+509 4116-3845",
    "sameAs": [
      "https://www.facebook.com/Kisabeauty",
      "https://www.tiktok.com/@Kisabeauty",
      "https://www.instagram.com/Kisabeauty05"
    ]
  };
  return (
    <Script id="schema-org" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(data)}
    </Script>
  );
}
