export default function SocialLinks() {
  const links = [
    { label: 'Facebook',  user: 'Kisabeauty',   href: 'https://www.facebook.com/Kisabeauty' },
    { label: 'TikTok',    user: '@Kisabeauty05',  href: 'https://www.tiktok.com/@Kisabeauty05' },
    { label: 'Instagram', user: '@Kisabeauty05',href: 'https://www.instagram.com/Kisabeauty05' },
  ];

  return (
    <section aria-labelledby="reseaux">
      <h2 id="reseaux" className="text-4xl font-bold text-pink-500">
        Réseaux de l’école
      </h2>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl bg-white ring-1 ring-pink-200 hover:ring-pink-300 hover:shadow-sm transition p-4 text-center"
          >
            <div className="text-sm text-slate-500">{l.label}</div>
            <div className="mt-1 text-lg font-medium text-pink-700 group-hover:text-pink-800">
              {l.user}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
