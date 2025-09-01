'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm md:text-base underline text-slate-600 hover:text-slate-800"
    >
      Imprimer le reçu
    </button>
  );
}
