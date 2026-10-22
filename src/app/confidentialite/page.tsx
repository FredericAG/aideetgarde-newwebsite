import Link from "next/link";
import { ACompleter } from "@/components/ACompleter";
import { PageLegale, Section } from "@/components/PageLegale";
import { ENTREPRISE } from "@/lib/entreprise";

export const metadata = {
  title: "Confidentialité et cookies — Aide & Garde",
  description: "Quelles données Aide & Garde traite, pourquoi, combien de temps, avec qui, et comment exercer vos droits.",
};

/**
 * Politique de confidentialité et cookies (RGPD, art. 13 ; loi
 * Informatique et Libertés, art. 82 ; fiche service-public F37351).
 * Rédigée d'après ce que fait réellement le site ; les durées de
 * conservation restent à arrêter par Aide & Garde (spécifications § 5.3).
 */
const DUREES = {
  // Proposition du 23/10/2026, d'après le référentiel CNIL « gestion des
  // activités commerciales » et les délais de prescription. La suppression
  // automatique reste à programmer (spécifications § 9).
  compte: "pendant l'abonnement, puis 5 ans après sa fin (délai de prescription)",
  documents:
    "pendant l'abonnement, puis 5 ans après sa fin : c'est aussi la durée pendant laquelle un employeur doit conserver le double des bulletins de paie ; pensez à télécharger les vôtres avant",
  sansAbonnement: "2 ans sans connexion, puis suppression ; 3 mois si l'adresse email n'a jamais été confirmée",
  preuves: "5 ans après la fin de l'abonnement",
  paiements: "10 ans (pièces comptables)",
  recommandations: "jamais conservée : elle ne sert qu'à l'envoi demandé",
  techniques: "12 mois au plus",
};

/** Pixel Meta activé (variable Vercel) : le texte s'adapte. */
const PIXEL = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);

const sommaire = [
  { id: "responsable", titre: "Responsable du traitement" },
  { id: "donnees", titre: "Données traitées, finalités et bases légales" },
  { id: "destinataires", titre: "Destinataires et prestataires" },
  { id: "transferts", titre: "Lieu de stockage et transferts" },
  { id: "durees", titre: "Durées de conservation" },
  { id: "droits", titre: "Vos droits" },
  { id: "cookies", titre: "Cookies et traceurs" },
  { id: "securite", titre: "Sécurité" },
];

export default function ConfidentialitePage() {
  const e = ENTREPRISE;
  const td = "px-3 py-2 align-top";
  return (
    <PageLegale titre="Confidentialité et cookies" majLe="22/10/2026" sommaire={sommaire}>
      <Section id="responsable" titre="1. Responsable du traitement">
        <p>
          <ACompleter valeur={e.denomination} quoi="dénomination sociale" /> ({e.nomCommercial}),{" "}
          <ACompleter valeur={e.siege} quoi="adresse du siège" />. Contact pour toute question sur vos données :{" "}
          {e.email}.
        </p>
        <p>
          Pour les données de vos salariés, {e.nomCommercial} agit pour votre compte, dans le cadre du mandat que
          vous lui confiez : vous restez leur employeur et êtes tenu de les informer de ce traitement (une
          mention figure dans les contrats établis par {e.nomCommercial}).
        </p>
      </Section>

      <Section id="donnees" titre="2. Données traitées, finalités et bases légales">
        <div className="overflow-x-auto rounded-lg border border-brand-gray/25">
          <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
            <thead className="entete-teal">
              <tr>
                <th className="px-3 py-2">Données</th>
                <th className="px-3 py-2">Pourquoi</th>
                <th className="px-3 py-2">Base légale</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Votre compte : email, mot de passe (chiffré, illisible par nous), nom, prénom, téléphone, adresse", "Créer et sécuriser votre espace, vous contacter", "Exécution du contrat"],
                ["Vos salariés : identité, emploi, contrat, heures et événements déclarés chaque mois", "Établir contrats, bulletins de paie, déclarations et documents de fin de contrat", "Exécution du contrat (mandat)"],
                ["Documents de paie et contrats (PDF)", "Les mettre à votre disposition en permanence", "Exécution du contrat ; obligations légales de conservation"],
                ["Paiement : formule, montants, dates, 4 derniers chiffres et date d'expiration de la carte ; le numéro complet reste chez Systempay", "Encaisser l'abonnement, gérer les refus et les remboursements", "Exécution du contrat ; obligation comptable"],
                ["Acceptation des CGV, rétractation, résiliation : date, heure et contenu", "Prouver vos choix et y donner suite", "Obligation légale"],
                ["Notifications sur votre téléphone ou ordinateur : adresse technique de l'appareil", "Vous prévenir d'un nouveau document", "Consentement (activation dans « Mon compte », désactivable à tout moment)"],
                ["Emails de service et de relance (copies des notifications désactivables)", "Vous informer de la vie de votre dossier", "Exécution du contrat ; intérêt légitime"],
                ["Recommandation : prénom et email de la personne à qui vous écrivez, votre message", "Lui envoyer votre message, une seule fois (l'adresse n'est pas conservée)", "Intérêt légitime (envoi demandé par vous)"],
              ["Journaux techniques (adresse IP, date et heure de connexion)", "Sécurité du site et des comptes", "Intérêt légitime"],
              ...(PIXEL
                ? [["Pages publiques visitées, identifiant de cookie Meta", "Mesurer l'efficacité de nos publicités", "Consentement (bandeau cookies)"]]
                : []),
              ].map(([d, f, b]) => (
                <tr key={d} className="border-t border-brand-gray/20 even:bg-[#f7f7f7]">
                  <td className={td}>{d}</td>
                  <td className={td}>{f}</td>
                  <td className={td}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Aucune donnée n&apos;est vendue ni utilisée à des fins publicitaires.</p>
      </Section>

      <Section id="destinataires" titre="3. Destinataires et prestataires">
        <p>
          Vos données sont traitées par l&apos;équipe {e.nomCommercial} et, pour la stricte exécution du
          service, par :
        </p>
        <ul>
          <li><strong>Supabase</strong> (base de données, comptes, fichiers PDF), données stockées à Paris ;</li>
          <li><strong>Vercel</strong> (hébergement du site), serveurs à Paris ;</li>
          <li><strong>Brevo</strong> (envoi des emails), société française ;</li>
          <li><strong>Lyra Network — Systempay</strong> et la <strong>BRED Banque Populaire</strong> (paiement par carte) ;</li>
          <li>l&apos;<strong>Urssaf</strong> (centres Pajemploi et Cesu) et les organismes sociaux, pour les déclarations faites pour votre compte ;</li>
          {PIXEL && (
            <li>
              <strong>Meta Platforms Ireland</strong> (Facebook, Instagram), uniquement si vous l&apos;acceptez, pour
              la mesure des publicités sur les pages publiques du site (voir l&apos;article 7).
            </li>
          )}
        </ul>
      </Section>

      <Section id="transferts" titre="4. Lieu de stockage et transferts">
        <p>
          Les données sont stockées en France (Paris). Supabase et Vercel sont des sociétés américaines : leurs
          contrats de sous-traitance prévoient les garanties exigées par le RGPD (clauses contractuelles types de
          la Commission européenne) pour le cas où un accès depuis l&apos;étranger serait nécessaire.
        </p>
      </Section>

      <Section id="durees" titre="5. Durées de conservation">
        <ul>
          <li>Compte et données de vos salariés : {DUREES.compte}.</li>
          <li>Documents de paie et contrats : {DUREES.documents}.</li>
          <li>Compte créé sans abonnement : {DUREES.sansAbonnement}.</li>
          <li>Acceptation des CGV, rétractation, résiliation : {DUREES.preuves}.</li>
          <li>Données de paiement et factures : {DUREES.paiements}.</li>
          <li>Adresse email d&apos;une personne à qui vous recommandez {e.nomCommercial} : {DUREES.recommandations}.</li>
          <li>Journaux techniques : {DUREES.techniques}.</li>
        </ul>
      </Section>

      <Section id="droits" titre="6. Vos droits">
        <p>
          Vous pouvez accéder à vos données, les faire rectifier ou effacer, en limiter le traitement, vous y
          opposer, en recevoir une copie dans un format réutilisable, et donner des directives pour après votre
          décès. Écrivez à {e.email} ; nous répondons sous un mois. Vous pouvez aussi saisir la CNIL
          (cnil.fr).
        </p>
        <p>
          Vos coordonnées se modifient directement dans <Link href="/mon-compte" className="text-brand-teal underline">Mon compte</Link>.
        </p>
      </Section>

      <Section id="cookies" titre="7. Cookies et traceurs">
        <p>
          {PIXEL ? "Sans votre accord, le site" : "Le site"} n&apos;utilise que des traceurs{" "}
          <strong>strictement nécessaires</strong> à son fonctionnement, qui ne demandent pas votre consentement :
        </p>
        <ul>
          <li>le cookie de session, qui vous garde connecté à votre espace ;</li>
          <li>une mémoire dans votre navigateur de votre choix sur les notifications (pour ne pas vous le redemander) ;</li>
          <li>les traceurs du formulaire de paiement Systempay, au moment où vous payez{PIXEL ? " ;" : "."}</li>
          {PIXEL && <li>le cookie qui retient votre choix sur les cookies publicitaires (6 mois).</li>}
        </ul>
        {PIXEL ? (
          <>
            <p>
              <strong>Avec votre accord seulement</strong>, le pixel Meta (Facebook) mesure l&apos;efficacité de nos
              publicités : il enregistre les pages publiques du site que vous visitez (accueil, centre d&apos;aide,
              pages d&apos;information) et dépose un cookie de Meta (« _fbp », 90 jours). Il n&apos;est jamais chargé
              dans votre espace personnel, ni sur les pages de connexion et d&apos;inscription : aucune donnée de
              votre compte, de vos salariés ou de leur paie n&apos;est transmise à Meta. Meta Platforms Ireland est
              responsable conjoint de ce traitement ; ses données peuvent être transférées aux États-Unis
              (cadre de protection des données UE–États-Unis).
            </p>
            <p>
              Votre choix est demandé à la première visite (« Tout accepter » ou « Tout refuser »), conservé 6 mois,
              et modifiable à tout moment par le lien « Gérer les cookies » en bas de chaque page. Refuser
              n&apos;empêche pas d&apos;utiliser le site.
            </p>
          </>
        ) : (
          <p>
            Aucun outil de mesure d&apos;audience ni de publicité n&apos;est utilisé. Si cela changeait, un bandeau
            vous demanderait votre accord, modifiable à tout moment.
          </p>
        )}
      </Section>

      <Section id="securite" titre="8. Sécurité">
        <p>
          Connexion chiffrée (HTTPS), espace privé par compte, documents stockés dans un espace privé et
          téléchargeables seulement par un lien valable 60 secondes, mots de passe jamais stockés en clair,
          numéro de carte jamais transmis à {e.nomCommercial}.
        </p>
      </Section>
    </PageLegale>
  );
}
