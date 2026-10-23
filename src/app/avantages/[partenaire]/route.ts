import { NextResponse } from "next/server";
import { getSessionCourante } from "@/lib/auth";
import { clientServeur } from "@/lib/supabase/admin";
import { PARTENAIRES, PROVENANCES, type ClePartenaire } from "@/lib/partenaires";

/**
 * Lien suivi vers un partenaire (ASC, Ircem, SPSTN) ou vers la fiche PDF du
 * salarié : compte le clic puis redirige. Le comptage ne bloque jamais la
 * redirection. Ne sont pas comptés : l'administrateur (tests) et les robots.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ partenaire: string }> }) {
  const { partenaire } = await params;
  const cible = PARTENAIRES[partenaire as ClePartenaire];
  if (!cible) return NextResponse.redirect(new URL("/aide/avantages-du-salarie", request.url), 302);

  const url = new URL(request.url);
  const depuisDemande = url.searchParams.get("depuis") ?? "";
  const depuis = depuisDemande in PROVENANCES ? depuisDemande : "autre";
  const agent = request.headers.get("user-agent") ?? "";
  const robot = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget/i.test(agent);

  try {
    const { user, profile } = await getSessionCourante();
    const db = clientServeur();
    if (db && !robot && profile?.role !== "admin") {
      await db.from("clics_partenaires").insert({ partenaire, depuis, employeur_id: user?.id ?? null });
    }
  } catch (e) {
    console.error("Clic partenaire non compté :", e);
  }

  const destination = cible.url.startsWith("http") ? cible.url : new URL(cible.url, request.url).toString();
  const reponse = NextResponse.redirect(destination, 302);
  reponse.headers.set("Cache-Control", "no-store");
  reponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  return reponse;
}
