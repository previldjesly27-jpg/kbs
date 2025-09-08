import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Kisa Beauty School <onboarding@resend.dev>";
const ADMINS = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
  const { nom, email, telephone, programme, specialites = [] } = await req.json();
  if (!nom || !email || !programme) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const horaire = String(programme).toLowerCase() === "weekend" ? "Weekend" : "Semaine";
  const specs = (specialites as string[]).map(s =>
    s === "cosmetologie" ? "Cosmétologie"
    : s === "style-crochet" ? "Style crochet"
    : s === "maquillage" ? "Maquillage"
    : s === "decoration" ? "Décoration"
    : s
  ).join(" / ");

  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: email,
      subject: "Kisa Beauty School – Confirmation d'inscription",
      html: `<p>Bonjour <b>${nom}</b>, merci pour votre inscription.</p>
             <p><b>Programme :</b> ${specs ? `${specs} / ${horaire}` : horaire}</p>`
    }),
    ADMINS.length ? resend.emails.send({
      from: FROM,
      to: ADMINS,
      subject: `KBS – Nouvelle inscription: ${nom}`,
      html: `<p>Nom: <b>${nom}</b><br>Email: ${email}<br>Téléphone: ${telephone || "—"}<br>Programme: ${specs ? `${specs} / ${horaire}` : horaire}</p>`
    }) : Promise.resolve()
  ]);

  return NextResponse.json({ ok: true });
}
