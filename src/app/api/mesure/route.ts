import { clientServeur } from "@/lib/supabase/admin";
import { normaliserPage, type Origine } from "@/lib/origine";

/**
 * Comptage anonyme d'une page vue (mesure du tunnel, script brique12).
 * Seuls la page et l'origine sont gardées, en totaux par jour : ni adresse
 * IP, ni navigateur, ni compte. Les robots déclarés ne sont pas comptés.
 */
export const dynamic = "force-dynamic";

const ORIGINES = new Set<Origine>([
  "direct", "interne", "moteur", "annonce", "reseaux", "recommandation", "partenaire", "email", "autre_site",
]);
const ROBOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;

export async function POST(request: Request) {
  if (ROBOTS.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  let p = "";
  let o = "";
  try {
    const corps = JSON.parse((await request.text()).slice(0, 500)) as { p?: unknown; o?: unknown };
    p = typeof corps.p === "string" ? normaliserPage(corps.p) : "";
    o = typeof corps.o === "string" ? corps.o : "";
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!p.startsWith("/") || p.startsWith("/admin") || p.startsWith("/api") || !ORIGINES.has(o as Origine)) {
    return new Response(null, { status: 204 });
  }
  const db = clientServeur();
  if (db) {
    const { error } = await db.rpc("compter_visite", { p_page: p, p_origine: o });
    // Sans le script brique12 : rien n'est compté, sans bruit.
    if (error && error.code !== "PGRST202") console.error("Mesure :", error.message);
  }
  return new Response(null, { status: 204 });
}
