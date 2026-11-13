import { lireEnfants } from "@/lib/contrat/champs";

/**
 * Anniversaires qui changent l'aide de la CAF pour la garde (demande du
 * 12/11/2026), d'après la réforme du complément de libre choix du mode de
 * garde (CMG) du 1er septembre 2025 (FAQ caf.fr) :
 *
 * - le CMG n'est plus divisé par deux aux 3 ans de l'enfant ; seule la prise
 *   en charge des cotisations sociales a un plafond qui dépend de son âge ;
 * - le CMG emploi direct s'arrête aux 6 ans de l'enfant, sauf pour les
 *   familles monoparentales : il continue alors jusqu'à ses 12 ans (pour la
 *   garde effectuée depuis le 1er septembre 2025).
 *
 * Aucun montant n'est donné ici : il dépend de chaque foyer.
 */
export interface AlerteAgeEnfant {
  prenom: string;
  age: 3 | 6 | 12;
  /** Date de l'anniversaire, AAAA-MM-JJ. */
  date: string;
  /** L'anniversaire tombe dans le mois déclaré (sinon : le mois suivant). */
  ceMois: boolean;
  texte: string;
}

const TEXTES: Record<AlerteAgeEnfant["age"], string> = {
  3: "La part des cotisations prise en charge par la CAF (CMG) est plafonnée plus bas à partir de 3 ans : votre reste à charge peut augmenter un peu.",
  6: "Le CMG emploi direct s'arrête à ses 6 ans, sauf si vous élevez seul(e) votre enfant : il continue alors jusqu'à ses 12 ans.",
  12: "Si vous élevez seul(e) votre enfant, le CMG emploi direct s'arrête à ses 12 ans.",
};

/** Alertes pour le mois « AAMM » déclaré et le mois suivant. */
export function alertesAgeEnfants(enfantsJson: string | undefined, periode: string): AlerteAgeEnfant[] {
  if (!/^\d{4}$/.test(periode)) return [];
  const annee = 2000 + Number(periode.slice(0, 2));
  const mois = Number(periode.slice(2, 4));
  const suivant = mois === 12 ? { a: annee + 1, m: 1 } : { a: annee, m: mois + 1 };
  const alertes: AlerteAgeEnfant[] = [];
  for (const e of lireEnfants(enfantsJson)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.naissance)) continue;
    const [an, mo, jo] = e.naissance.split("-").map(Number);
    for (const age of [3, 6, 12] as const) {
      const a = an + age;
      const ceMois = a === annee && mo === mois;
      const moisSuivant = a === suivant.a && mo === suivant.m;
      if (!ceMois && !moisSuivant) continue;
      alertes.push({
        prenom: e.prenom.trim() || "Votre enfant",
        age,
        date: `${a}-${String(mo).padStart(2, "0")}-${String(jo).padStart(2, "0")}`,
        ceMois,
        texte: TEXTES[age],
      });
    }
  }
  return alertes;
}
