"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/inscription", label: "Inscription" },
    { href: "/contact", label: "Contact" },
    { href: "/publication", label: "Magazine" },
  { href: "/galerie", label: "Galerie" },
  { href: "/temoignages", label: "Témoignages" },
  { href: "/admin", label: "Admin" }, // décommente si tu veux l’afficher
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-pink-500 text-white shadow">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        {/* Logo + titre */}
        <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
          {/* Mets /logo-kbs.svg si tu utilises un SVG */}
          <Image
            src="/logo-kbs.png"
            alt="Kisa Beauty School"
            width={36}
            height={36}
            className="rounded-full bg-white p-1"
            priority
          />
          <span className="font-bold">Kisa Beauty School</span>
        </Link>

        {/* Liens desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 rounded-md px-1 py-0.5"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Bouton hamburger (mobile) */}
        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
        >
          {open ? (
            // Icône "X"
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          ) : (
            // Icône hamburger
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile déroulant */}
      <div
        id="mobile-menu"
        className={`${open ? "block" : "hidden"} md:hidden border-t border-white/20 bg-pink-500`}
      >
        <nav className="px-4 py-2 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeMenu}
              className="py-3 border-b border-white/10 last:border-b-0 hover:bg-white/10 rounded-md px-2"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
