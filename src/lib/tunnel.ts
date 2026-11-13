import type { SupabaseClient } from "@supabase/supabase-js";
import { bornesDuMois } from "@/lib/paie-du-mois";
import { ORIGINES_DECLAREES, type Origine } from "@/lib/origine";

/**
 * Entonnoir d'acquisition d'un mois (mesure du tunnel, audit T1,
 * 13/11/2026) :
 * - visites : arrivées sur le site (pages vues dont l'origine n'est pas la
 *   navigation interne), comptées sans cookie (script brique12) ;
 * - comptes créés dans le mois, puis, parmi eux, ceux qui ont souscrit et
 *   ceux qui ont envoyé une gestion (à ce jour) ;
 * - par origine déclarée à l'inscription.
 */
export interface Tunnel {
  installe: boolean;
  arrivees: number;
  pagesVues: number;
  parOrigine: { origine: Origine; nb: number }[];
  pagesArrivee: { page: string; nb: number }[];
  comptes: number;
  abonnes: number;
  avecGestion: number;
  parOrigineDeclaree: { cle: string; libelle: string; comptes: number; abonnes: number; avecGestion: number }[];
  /** Hors cohorte : abonnements démarrés et gestions envoyées dans le mois. */
  souscriptionsDuMois: number;
  gestionsEnvoyeesDuMois: number;
}

export async function lireTunnel(supabase: SupabaseClient, periode: string): Promise<Tunnel> {
  const { debut, fin } = bornesDuMois(periode);
  const finExclue = new Date(`${fin}T00:00:00Z`);
  finExclue.setUTCDate(finExclue.getUTCDate() + 1);
  const avant = finExclue.toISOString().slice(0, 10);

  const [visitesRes, comptesRes, souscRes, envoisRes] = await Promise.all([
    supabase.from("visites_jour").select("page, origine, nb").gte("jour", debut).lte("jour", fin).limit(10000),
    supabase
      .from("profiles")
      .select("id, origine_declaree")
      .eq("role", "employeur")
      .gte("created_at", debut)
      .lt("created_at", avant)
      .limit(2000),
    supabase.from("abonnements").select("id", { count: "exact", head: true }).gte("date_debut", debut).lte("date_debut", fin),
    supabase.from("gestions").select("id", { count: "exact", head: true }).gte("envoyee_le", debut).lt("envoyee_le", avant),
  ]);

  const installe = !visitesRes.error && !comptesRes.error;
  const visites = (visitesRes.data ?? []) as { page: string; origine: Origine; nb: number }[];
  const parOrig = new Map<Origine, number>();
  const parPage = new Map<string, number>();
  let arrivees = 0;
  let pagesVues = 0;
  for (const v of visites) {
    pagesVues += v.nb;
    if (v.origine === "interne") continue;
    arrivees += v.nb;
    parOrig.set(v.origine, (parOrig.get(v.origine) ?? 0) + v.nb);
    parPage.set(v.page, (parPage.get(v.page) ?? 0) + v.nb);
  }

  const comptes = (comptesRes.data ?? []) as { id: string; origine_declaree: string | null }[];
  const ids = comptes.map((c) => c.id);
  const [abosRes, gestRes] = ids.length
    ? await Promise.all([
        supabase.from("abonnements").select("employeur_id").in("employeur_id", ids).limit(5000),
        supabase.from("gestions").select("employeur_id").in("employeur_id", ids).not("envoyee_le", "is", null).limit(5000),
      ])
    : [{ data: [] }, { data: [] }];
  const abonnes = new Set(((abosRes.data ?? []) as { employeur_id: string }[]).map((a) => a.employeur_id));
  const avecGestion = new Set(((gestRes.data ?? []) as { employeur_id: string }[]).map((g) => g.employeur_id));

  const decl = new Map<string, { comptes: number; abonnes: number; avecGestion: number }>();
  for (const c of comptes) {
    const cle = c.origine_declaree ?? "non_renseigne";
    const l = decl.get(cle) ?? { comptes: 0, abonnes: 0, avecGestion: 0 };
    l.comptes++;
    if (abonnes.has(c.id)) l.abonnes++;
    if (avecGestion.has(c.id)) l.avecGestion++;
    decl.set(cle, l);
  }
  const libelleDecl = (cle: string) =>
    cle === "non_renseigne" ? "Non renseigné" : (ORIGINES_DECLAREES as Record<string, string>)[cle] ?? cle;

  return {
    installe,
    arrivees,
    pagesVues,
    parOrigine: [...parOrig].map(([origine, nb]) => ({ origine, nb })).sort((a, b) => b.nb - a.nb),
    pagesArrivee: [...parPage].map(([page, nb]) => ({ page, nb })).sort((a, b) => b.nb - a.nb).slice(0, 10),
    comptes: comptes.length,
    abonnes: comptes.filter((c) => abonnes.has(c.id)).length,
    avecGestion: comptes.filter((c) => avecGestion.has(c.id)).length,
    parOrigineDeclaree: [...decl]
      .map(([cle, l]) => ({ cle, libelle: libelleDecl(cle), ...l }))
      .sort((a, b) => b.comptes - a.comptes),
    souscriptionsDuMois: souscRes.count ?? 0,
    gestionsEnvoyeesDuMois: envoisRes.count ?? 0,
  };
}
