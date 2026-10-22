import Image from "next/image";
import Link from "next/link";
import { ACompleter } from "@/components/ACompleter";
import { PageLegale, Section } from "@/components/PageLegale";
import { ACTIVITES_DECLAREES, CHARTE_QUALITE, ENTREPRISE, HEBERGEURS, MENTION_MANDATAIRE } from "@/lib/entreprise";

export const metadata = {
  title: "Mentions légales — Aide & Garde",
  description: "Éditeur du site, directeur de la publication, hébergeur et propriété intellectuelle.",
};

/** Mentions légales (loi n° 2004-575 du 21 juin 2004, art. 1-1 et 6 ; fiche F37351). */
export default function MentionsLegalesPage() {
  const e = ENTREPRISE;
  return (
    <PageLegale titre="Mentions légales" majLe="22/10/2026">
      <Section id="editeur" titre="Éditeur du site">
        <p>
          Le site aideetgarde.fr est édité par <ACompleter valeur={e.denomination} quoi="dénomination sociale" />{" "}
          (nom commercial : {e.nomCommercial}), <ACompleter valeur={e.formeJuridique} quoi="forme juridique" /> au
          capital de <ACompleter valeur={e.capital} quoi="capital social" />.
        </p>
        <ul>
          <li>Siège social : <ACompleter valeur={e.siege} quoi="adresse du siège" /></li>
          <li>Immatriculation : <ACompleter valeur={e.rcs} quoi="n° RCS ou RNE" /> (SIRET {e.siret})</li>
          {e.tauxTva === 0 ? (
            <li>TVA non applicable, article 293 B du code général des impôts</li>
          ) : (
            <li>N° de TVA intracommunautaire : <ACompleter valeur={e.tva} quoi="n° de TVA" /></li>
          )}
          <li>Téléphone : {e.telephone} (numéro non surtaxé)</li>
          <li>Email : {e.email}</li>
        </ul>
      </Section>

      <Section id="publication" titre="Directeur de la publication">
        <p><ACompleter valeur={e.directeurPublication} quoi="nom du directeur de la publication" /></p>
      </Section>

      <Section id="activite" titre="Activité réglementée : services à la personne">
        <p>
          {e.nomCommercial} est un organisme de services à la personne déclaré :{" "}
          <ACompleter valeur={e.sap} quoi="n° de déclaration SAP" />, auprès de{" "}
          <ACompleter valeur={e.sapAutorite} quoi="autorité" />. Activités déclarées, toutes en{" "}
          <strong>mode mandataire</strong> :
        </p>
        <ul>
          {ACTIVITES_DECLAREES.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="rounded-md border-l-4 border-brand-jaune bg-brand-jaune/15 px-3 py-2">
          <strong>Mode mandataire.</strong> {MENTION_MANDATAIRE}
        </p>
        {CHARTE_QUALITE.adherent && (
          <div className="flex items-center gap-4">
            <Image
              src={CHARTE_QUALITE.logo}
              alt={`Charte nationale Qualité des services à la personne ${CHARTE_QUALITE.annee}`}
              width={70}
              height={103}
            />
            <p>
              {e.nomCommercial} adhère à la Charte nationale Qualité des services à la personne : accueil et
              réactivité, information claire, suivi personnalisé, compétence, confidentialité, évaluation annuelle
              de la qualité de ses services. Liste des adhérents sur{" "}
              <a href={CHARTE_QUALITE.lien} className="text-brand-teal underline" target="_blank" rel="noopener noreferrer">
                servicesalapersonne.gouv.fr
              </a>
              .
            </p>
          </div>
        )}
      </Section>

      <Section id="hebergement" titre="Hébergement">
        {HEBERGEURS.map((h) => (
          <p key={h.nom}>
            {h.role} : <strong>{h.nom}</strong>, {h.adresse} ({h.contact}). {h.lieu}.
          </p>
        ))}
        <p>
          Les autres prestataires qui traitent des données (base de données, emails, paiement) sont listés dans
          la <Link href="/confidentialite#destinataires" className="text-brand-teal underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section id="propriete" titre="Propriété intellectuelle">
        <p>
          La marque et le logo {e.nomCommercial}, la charte graphique, les textes du site et du centre d&apos;aide
          sont la propriété de <ACompleter valeur={e.denomination} quoi="dénomination sociale" />. Toute
          reproduction, même partielle, sans autorisation écrite est interdite. Les textes officiels cités
          (Code du travail, convention collective) restent la propriété de leurs auteurs publics.
        </p>
      </Section>

      <Section id="liens" titre="Autres informations">
        <p>
          <Link href="/confidentialite" className="text-brand-teal underline">Confidentialité et cookies</Link> ·{" "}
          <Link href="/cgv" className="text-brand-teal underline">Conditions générales de vente</Link>
        </p>
      </Section>
    </PageLegale>
  );
}
