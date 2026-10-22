import { ACompleter } from "@/components/ACompleter";
import { ENTREPRISE, MENTION_DEVIS, MENTION_MANDATAIRE, libelleTva } from "@/lib/entreprise";

/**
 * Mentions qui doivent accompagner les prix d'un organisme de services à la
 * personne en mode mandataire (arrêté du 17 mars 2015) : nature du prix et
 * TVA, mention « le consommateur est l'employeur », devis gratuit, et
 * l'avantage fiscal (mention distincte, plus petite que les prix).
 *
 * Principe (Frédéric, 23/10/2026) : les abonnés viennent pour se décharger de
 * l'administratif et veulent comprendre d'un coup d'œil. Les textes légaux
 * restent donc complets et lisibles, mais en notes discrètes sous les prix,
 * sans encadré ni couleur qui les mettraient au premier plan.
 */
export function MentionsPrix() {
  const tva = libelleTva();
  return (
    <div className="flex flex-col gap-1 border-t border-brand-gray/15 pt-3 text-[0.7rem] leading-snug text-foreground/55">
      <p>
        {ENTREPRISE.tauxTva === 0 ? "Prix mensuels nets" : "Prix mensuels toutes taxes comprises"},{" "}
        {tva ?? <ACompleter valeur={null} quoi="taux de TVA" />}. Frais de mandat : le salaire et les cotisations de
        vos salariés ne sont pas compris. Crédit d&apos;impôt de 50 % possible (article 199 sexdecies du code général
        des impôts).
      </p>
      <p>
        <span className="font-semibold">Mode mandataire.</span> {MENTION_MANDATAIRE}
      </p>
      <p>{MENTION_DEVIS}</p>
    </div>
  );
}
