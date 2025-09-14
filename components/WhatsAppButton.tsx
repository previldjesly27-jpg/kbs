"use client";

type Props = {
  phone: string;               // ex: "+50941163845"
  message?: string;            // message pré-rempli
  className?: string;
};

export default function WhatsAppButton({
  phone,
  message = "Bonjour KBS, je voudrais des infos.",
  className = "",
}: Props) {
  const href = `https://wa.me/${phone.replace(/\D+/g, "")}?text=${encodeURIComponent(message)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contacter sur WhatsApp"
      className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center ${className}`}
    >
      {/* icône WhatsApp */}
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.02c-.27-.14-1.6-.79-1.84-.88-.24-.09-.42-.14-.6.14-.18.27-.69.88-.85 1.06-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.3-.79-.7-1.32-1.56-1.48-1.83-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.45-.83-1.98-.22-.53-.44-.46-.6-.46h-.51c-.18 0-.47.07-.72.34-.24.27-.95.93-.95 2.27 0 1.34.97 2.64 1.11 2.82.14.18 1.9 2.9 4.6 4.04 2.7 1.14 2.7.76 3.18.72.49-.04 1.6-.65 1.83-1.28.22-.63.22-1.17.16-1.28-.05-.11-.22-.18-.49-.31z" />
        <path d="M16 3C8.83 3 3 8.83 3 16c0 2.3.63 4.46 1.72 6.31L3 29l6.86-1.8A12.94 12.94 0 0 0 16 29c7.17 0 13-5.83 13-13S23.17 3 16 3zm0 23.5c-2.2 0-4.24-.72-5.89-1.92l-.42-.3-4.06 1.07 1.09-3.95-.32-.43A10.47 10.47 0 1 1 26.5 16c0 5.79-4.71 10.5-10.5 10.5z" />
      </svg>
    </a>
  );
}
