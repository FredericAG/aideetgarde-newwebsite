/**
 * Origine d'une visite (mesure du tunnel, 13/11/2026) : déduite de l'adresse
 * de la page d'arrivée (paramètres utm_*, gclid, source=recommandation) et
 * de la page précédente (referrer). Rien n'est lu ni écrit sur l'appareil du
 * visiteur : pas de cookie, pas de stockage.
 */
export type Origine =
  | "direct"
  | "interne"
  | "moteur"
  | "annonce"
  | "reseaux"
  | "recommandation"
  | "partenaire"
  | "email"
  | "autre_site";

export const LIBELLES_ORIGINE: Record<Origine, string> = {
  direct: "Accès direct",
  interne: "Navigation sur le site",
  moteur: "Moteur de recherche",
  annonce: "Annonce payante",
  reseaux: "Réseaux sociaux",
  recommandation: "Recommandation d'un abonné",
  partenaire: "Partenaire",
  email: "E-mail",
  autre_site: "Autre site",
};

/** Réponses à « Comment nous avez-vous connus ? » (inscription). */
export const ORIGINES_DECLAREES = {
  recherche: "Une recherche sur Internet",
  annonce: "Une publicité (Google, réseaux sociaux…)",
  proche: "Un proche, un ami, un collègue",
  partenaire: "Un partenaire (employeur, mutuelle, IRCEM…)",
  professionnel: "Un professionnel (crèche, PMI, assistante sociale…)",
  reseaux: "Les réseaux sociaux",
  deja_client: "J'étais déjà client d'Aide & Garde",
  autre: "Autre",
} as const;
export type OrigineDeclaree = keyof typeof ORIGINES_DECLAREES;

const MOTEURS = /(^|\.)(google|bing|qwant|duckduckgo|ecosia|yahoo|lilo|startpage|yandex|baidu)\./;
const RESEAUX = /(^|\.)(facebook|fb|instagram|linkedin|lnkd|twitter|x|t|pinterest|whatsapp|youtube|tiktok|snapchat|messenger)\.(com|co|me|fr|net|in)$/;
const MESSAGERIES = /(^|\.)(mail\.google|outlook\.live|outlook\.office|mail\.yahoo|webmail|mail\.orange|laposte|free|sfr|zimbra)\./;

export function classerOrigine(recherche: string, referrer: string, hoteDuSite: string): Origine {
  const p = new URLSearchParams(recherche);
  if (p.get("source") === "recommandation" || p.get("parrain")) return "recommandation";
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) return "annonce";
  const medium = (p.get("utm_medium") ?? "").toLowerCase();
  const src = (p.get("utm_source") ?? "").toLowerCase();
  if (medium || src) {
    if (/cpc|ppc|paid|ads?|display|sponsor/.test(medium)) return "annonce";
    if (/e-?mail|newsletter/.test(medium)) return "email";
    if (/partenaire|partner|affili/.test(medium)) return "partenaire";
    if (/social|reseau/.test(medium) || RESEAUX.test(`${src}.com`)) return "reseaux";
    return "autre_site";
  }
  if (p.get("fbclid")) return "reseaux";
  if (!referrer) return "direct";
  let hote = "";
  try {
    hote = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  const site = hoteDuSite.toLowerCase().replace(/^www\./, "");
  if (hote === site || hote.endsWith(`.${site}`) || hote === `www.${site}`) return "interne";
  if (MOTEURS.test(hote)) return "moteur";
  if (RESEAUX.test(hote)) return "reseaux";
  if (MESSAGERIES.test(hote)) return "email";
  return "autre_site";
}

/** Page ramenée à son modèle : identifiants remplacés (« /…/[id] »). */
export function normaliserPage(chemin: string): string {
  return (
    chemin
      .split("?")[0]
      .split("#")[0]
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/[id]")
      .replace(/\/\d+(?=\/|$)/g, "/[n]")
      .slice(0, 120) || "/"
  );
}
