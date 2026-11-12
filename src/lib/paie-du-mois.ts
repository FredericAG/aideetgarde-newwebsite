import type { SupabaseClient } from "@supabase/supabase-js";
import type { TypeGestion } from "@/lib/data";

/**
 * « Paie du mois » (audit du 12/11/2026, back-office) : pour un mois donné,
 * l'état de chaque gestion concernée, afin de travailler par tâche (les
 * déclarations à traiter, les abonnés à relancer, les bulletins déposés) et
 * non compte par compte.
 */

/** Où en est le bulletin d'une gestion pour le mois. */
export type EtatPaie =
  /** Déclaration reçue (ou correction demandée) : bulletin à établir. */
  | "a_traiter"
  /** Ni déclaration ni bulletin : l'abonné est à relancer. */
  | "sans_declaration"
  /** Bulletin en ligne. */
  | "bulletin"
  /** Mois clos sans bulletin par Aide & Garde. */
  | "close";

export const LIBELLES_ETAT_PAIE: Record<EtatPaie, string> = {
  a_traiter: "Déclaration à traiter",
  sans_declaration: "Sans déclaration",
  bulletin: "Bulletin en ligne",
  close: "Clos sans bulletin",
};

export interface LignePaie {
  etat: EtatPaie;
  gestion: {
    id: string;
    reference: string;
    employeur_id: string;
    type_gestion: TypeGestion;
    prenom_salarie: string;
    nom_salarie: string;
    statut: "en_cours" | "terminee";
    date_debut: string;
    date_fin: string | null;
    type_contrat: string | null;
    heures: number | null;
    unite_heures: string | null;
    salaire_horaire_net: number | null;
  };
  employeur: { prenom: string; nom: string; email: string | null; reference_client: string | null };
  declaration: {
    id: string;
    heures: number | null;
    commentaire: string;
    envoyee_le: string;
    /** L'abonné demande la correction d'un bulletin déjà en ligne. */
    correction: boolean;
    motif_modification: string | null;
  } | null;
  /** Date de mise en ligne du bulletin du mois, s'il existe. */
  bulletin_le: string | null;
}

/** « 2610 » valide (AAMM) ? */
export function periodeValide(p: string | undefined | null): p is string {
  return typeof p === "string" && /^[0-9]{2}(0[1-9]|1[0-2])$/.test(p);
}

/** Premier et dernier jour du mois « AAMM », au format AAAA-MM-JJ. */
export function bornesDuMois(periode: string): { debut: string; fin: string } {
  const annee = 2000 + Number(periode.slice(0, 2));
  const mois = Number(periode.slice(2, 4));
  const dernier = new Date(annee, mois, 0).getDate();
  const mm = String(mois).padStart(2, "0");
  return { debut: `${annee}-${mm}-01`, fin: `${annee}-${mm}-${String(dernier).padStart(2, "0")}` };
}

/** Mois voisins de « AAMM » (précédent : -1, suivant : +1). */
export function decalerPeriode(periode: string, de: number): string {
  const d = new Date(2000 + Number(periode.slice(0, 2)), Number(periode.slice(2, 4)) - 1 + de, 1);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Mois proposé par défaut : le mois précédent jusqu'au 10 (on établit alors
 * les bulletins du mois écoulé), le mois en cours ensuite. Même règle que
 * pour la déclaration de l'abonné.
 */
export function periodeParDefaut(aujourdhui = new Date()): string {
  const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - (aujourdhui.getDate() <= 10 ? 1 : 0), 1);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** L'API renvoie 1 000 lignes au plus par appel : on lit page par page. */
async function toutLire<T>(page: (de: number, a: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const PAS = 1000;
  const tout: T[] = [];
  for (let de = 0; de < 50 * PAS; de += PAS) {
    const { data, error } = await page(de, de + PAS - 1);
    if (error) throw new Error(error.message);
    const lignes = (data ?? []) as T[];
    tout.push(...lignes);
    if (lignes.length < PAS) break;
  }
  return tout;
}

function paquets<T>(liste: T[], taille = 150): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) r.push(liste.slice(i, i + taille));
  return r;
}

type GestionLue = LignePaie["gestion"] & { declarations_depuis: string | null };

/** État de la paie du mois, pour toutes les gestions concernées. */
export async function lirePaieDuMois(supabase: SupabaseClient, periode: string): Promise<LignePaie[]> {
  const { debut, fin } = bornesDuMois(periode);

  const [gestions, declarations, bulletins] = await Promise.all([
    toutLire<GestionLue>((de, a) =>
      supabase
        .from("gestions")
        .select(
          "id, reference, employeur_id, type_gestion, prenom_salarie, nom_salarie, statut, date_debut, date_fin, declarations_depuis, type_contrat, heures, unite_heures, salaire_horaire_net",
        )
        .in("statut", ["en_cours", "terminee"])
        .order("reference")
        .range(de, a),
    ),
    toutLire<{ id: string; gestion_id: string; heures: number | null; commentaire: string; statut: string; envoyee_le: string; motif_modification: string | null }>(
      (de, a) =>
        supabase
          .from("declarations_mensuelles")
          .select("id, gestion_id, heures, commentaire, statut, envoyee_le, motif_modification")
          .eq("periode", periode)
          .order("id")
          .range(de, a),
    ),
    toutLire<{ gestion_id: string; created_at: string }>((de, a) =>
      supabase
        .from("documents")
        .select("gestion_id, created_at")
        .eq("type_document", "bulletin")
        .eq("periode", periode)
        .order("id")
        .range(de, a),
    ),
  ]);

  // Gestions concernées par ce mois : commencées (ou reprises) au plus tard
  // en fin de mois, et pas terminées avant son premier jour.
  const concernees = gestions.filter((g) => {
    const depart = [g.date_debut, g.declarations_depuis].filter(Boolean).sort().at(-1) ?? "";
    if (depart.slice(0, 10) > fin) return false;
    if (g.date_fin && g.date_fin.slice(0, 10) < debut) return false;
    return true;
  });

  const idsEmployeurs = [...new Set(concernees.map((g) => g.employeur_id))];
  const profils = (
    await Promise.all(
      paquets(idsEmployeurs).map(async (ids) => {
        const { data, error } = await supabase.from("profiles").select("id, prenom, nom, email, reference_client").in("id", ids);
        if (error) throw new Error(error.message);
        return (data ?? []) as { id: string; prenom: string; nom: string; email: string | null; reference_client: string | null }[];
      }),
    )
  ).flat();
  const employeurs = new Map(profils.map((p) => [p.id, p]));
  const declarationDe = new Map(declarations.map((d) => [d.gestion_id, d]));
  const bulletinDe = new Map(bulletins.map((b) => [b.gestion_id, b.created_at]));

  return concernees.map((g): LignePaie => {
    const d = declarationDe.get(g.id);
    const bulletin = bulletinDe.get(g.id) ?? null;
    const enAttente = d && (d.statut === "envoyee" || d.statut === "modification");
    const etat: EtatPaie = enAttente
      ? "a_traiter"
      : bulletin
        ? "bulletin"
        : d?.statut === "close"
          ? "close"
          : d
            ? "a_traiter"
            : "sans_declaration";
    const e = employeurs.get(g.employeur_id);
    return {
      etat,
      gestion: g,
      employeur: { prenom: e?.prenom ?? "", nom: e?.nom ?? "", email: e?.email ?? null, reference_client: e?.reference_client ?? null },
      declaration: d
        ? {
            id: d.id,
            heures: d.heures,
            commentaire: d.commentaire ?? "",
            envoyee_le: d.envoyee_le,
            correction: d.statut === "modification",
            motif_modification: d.motif_modification ?? null,
          }
        : null,
      bulletin_le: bulletin,
    };
  });
}

/** Nombre de gestions par état. */
export function compterParEtat(lignes: LignePaie[]): Record<EtatPaie, number> {
  const n: Record<EtatPaie, number> = { a_traiter: 0, sans_declaration: 0, bulletin: 0, close: 0 };
  for (const l of lignes) n[l.etat]++;
  return n;
}

/** Délai pendant lequel un compte déjà relancé n'est pas relancé de nouveau. */
export const JOURS_ENTRE_RELANCES = 3;

export interface CompteARelancer {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  /** Salariés sans déclaration pour le mois. */
  salaries: string[];
}

/**
 * Comptes à relancer pour le mois : au moins une gestion EN COURS sans
 * déclaration ni bulletin, une adresse email, et pas de relance du même
 * type dans les derniers jours. `dejaRelances` : comptes écartés pour
 * cette dernière raison, avec la date de leur relance.
 */
export async function comptesARelancer(
  supabase: SupabaseClient,
  lignes: LignePaie[],
): Promise<{ aRelancer: CompteARelancer[]; dejaRelances: Map<string, string>; sansEmail: number }> {
  const depuis = new Date(Date.now() - JOURS_ENTRE_RELANCES * 86400000).toISOString();
  // Sans le script brique9c, la table n'existe pas : personne n'est écarté.
  const { data } = await supabase
    .from("relances")
    .select("employeur_id, envoye_le")
    .eq("modele", "declaration_mois")
    .gte("envoye_le", depuis)
    .order("envoye_le", { ascending: false })
    .limit(5000);
  const dejaRelances = new Map<string, string>();
  for (const r of (data ?? []) as { employeur_id: string; envoye_le: string }[]) {
    if (!dejaRelances.has(r.employeur_id)) dejaRelances.set(r.employeur_id, r.envoye_le);
  }

  const parCompte = new Map<string, CompteARelancer>();
  let sansEmail = 0;
  for (const l of lignes) {
    if (l.etat !== "sans_declaration" || l.gestion.statut !== "en_cours") continue;
    const id = l.gestion.employeur_id;
    if (dejaRelances.has(id)) continue;
    if (!l.employeur.email) {
      sansEmail++;
      continue;
    }
    const c = parCompte.get(id) ?? { id, prenom: l.employeur.prenom, nom: l.employeur.nom, email: l.employeur.email, salaries: [] };
    c.salaries.push(`${l.gestion.prenom_salarie} ${l.gestion.nom_salarie}`.trim());
    parCompte.set(id, c);
  }
  return { aRelancer: [...parCompte.values()], dejaRelances, sansEmail };
}
