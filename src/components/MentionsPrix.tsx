import { ACompleter } from "@/components/ACompleter";
import { ENTREPRISE, MENTION_MANDATAIRE, libelleTva } from "@/lib/entreprise";

/**
 * Informations qui doivent accompagner les prix d'un organisme de services
 * à la personne en mode mandataire (arrêté du 17 mars 2015, art. 2 à 5) :
 * mode d'intervention et mention « vous êtes l'employeur », nature du prix
 * (frais de mandat), TVA, et l'avantage fiscal dans une
 * mention distincte, en plus petit que les prix.
 * Utilisé dans les CGV et sur le formulaire de souscription.
 */
export function MentionsPrix() {
  const tva = libelleTva();
  return (
    <div className="flex flex-col gap-2 text-xs leading-relaxed text-foreground/75">
      <p>
        {ENTREPRISE.tauxTva === 0 ? "Prix mensuels nets" : "Prix mensuels toutes taxes comprises"},{" "}
        {tva ?? <ACompleter valeur={null} quoi="taux de TVA (20 % ou « TVA non applicable »)" />}. L&apos;abonnement
        rémunère le mandat confié à {ENTREPRISE.nomCommercial} (frais de gestion) ; il ne comprend ni le salaire
        ni les cotisations sociales de vos salariés, que vous réglez vous-même.
      </p>
      <p className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/15 px-3 py-2 text-foreground/85">
        <strong>Mode mandataire.</strong> {MENTION_MANDATAIRE}
      </p>
      <p className="text-[0.7rem] text-foreground/60">
        {ENTREPRISE.nomCommercial} est un organisme de services à la personne déclaré : les sommes versées au
        titre de l&apos;abonnement peuvent ouvrir droit à un crédit d&apos;impôt de 50 %, pour les activités
        couvertes par sa déclaration et dans les conditions de l&apos;article 199 sexdecies du code général des
        impôts.
      </p>
    </div>
  );
}
